import { Injectable, ConflictException, NotFoundException, Logger } from "@nestjs/common";
import { IpfsService } from "../../common/ipfs/ipfs.service";
import { PrismaService } from "../../config/prisma.service";
import { ethers } from "ethers";

@Injectable()
export class DidService {
  private readonly logger = new Logger(DidService.name);
  constructor(private ipfsService: IpfsService, private prisma: PrismaService) {}

  async createDid(userAddress: string) {
    const existing = await this.prisma.creator.findUnique({ where: { address: userAddress.toLowerCase() } });
    if (existing?.did) throw new ConflictException("DID already registered");

    const did = `did:fisco:bcos:${userAddress.toLowerCase()}`;
    const didDocument = {
      "@context": ["https://www.w3.org/ns/did/v1"], id: did,
      verificationMethod: [{ id: `${did}#keys-1`, type: "EcdsaSecp256k1VerificationKey2019", controller: did, publicKeyHex: userAddress.toLowerCase() }],
    };
    const didDocJson = JSON.stringify(didDocument);
    const didCid = await this.ipfsService.uploadJson(didDocJson);
    const didHash = ethers.keccak256(ethers.toUtf8Bytes(didDocJson));

    // 只写数据库，不调链（前端用 MetaMask 调合约后调 /api/sync/did 同步）
    await this.prisma.creator.upsert({
      where: { address: userAddress.toLowerCase() },
      update: { did, didHash, didCid, registeredAt: new Date() },
      create: { address: userAddress.toLowerCase(), did, didHash, didCid, registeredAt: new Date() },
    });

    this.logger.log(`DID created (DB only): ${did}`);
    return { did, didCid, didHash, txHash: "pending-chain-registration" };
  }

  async issueCreatorVC(adminAddress: string, creatorAddress: string) {
    const creator = await this.prisma.creator.findUnique({ where: { address: creatorAddress.toLowerCase() } });
    if (!creator?.did) throw new NotFoundException("Creator not registered");

    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "CreatorCertification"],
      issuer: { id: `did:fisco:bcos:platform` },
      issuanceDate: new Date().toISOString(),
      credentialSubject: { id: creator.did, type: "OriginalCreator", address: creatorAddress.toLowerCase() },
    };
    const vcCid = await this.ipfsService.uploadJson(JSON.stringify(vc));

    await this.prisma.creator.update({ where: { address: creatorAddress.toLowerCase() }, data: { vcCid, isVerified: true } });
    this.logger.log(`VC issued for: ${creatorAddress}`);
    return { vc, vcCid };
  }

  async getCreator(address: string) {
    const creator = await this.prisma.creator.findUnique({ where: { address: address.toLowerCase() } });
    if (!creator) throw new NotFoundException("Creator not found");
    return { address: creator.address, did: creator.did, didCid: creator.didCid, vcCid: creator.vcCid, isVerified: creator.isVerified, reputation: 100, registeredAt: creator.registeredAt };
  }

  async resolveDid(didOrAddress: string) {
    let address = didOrAddress.startsWith("did:fisco:bcos:") ? didOrAddress.replace("did:fisco:bcos:", "") : didOrAddress;
    const creator = await this.prisma.creator.findUnique({ where: { address: address.toLowerCase() } });
    if (!creator?.didCid) throw new NotFoundException("DID not resolved");
    const doc = await this.ipfsService.fetchJson(creator.didCid);
    if (!doc) throw new NotFoundException("DID document not found");
    return doc;
  }
}