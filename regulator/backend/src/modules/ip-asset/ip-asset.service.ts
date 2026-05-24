import { Injectable, ForbiddenException, ConflictException, NotFoundException } from "@nestjs/common";
import { IpfsService } from "../../common/ipfs/ipfs.service";
import { PrismaService } from "../../config/prisma.service";
import { ethers } from "ethers";

@Injectable()
export class IpAssetService {
  constructor(private ipfsService: IpfsService, private prisma: PrismaService) {}

  async prepareMint(dto: { creatorAddress: string; nfcChipUID: string; artworkFile: Buffer; metadata: { name: string; description: string; series: string } }) {
    const creator = await this.prisma.creator.findUnique({ where: { address: dto.creatorAddress.toLowerCase() } });
    if (!creator?.isVerified) throw new ForbiddenException("Creator not verified");

    const nfcHash = ethers.keccak256(ethers.toUtf8Bytes(dto.nfcChipUID));
    const artworkCid = await this.ipfsService.uploadFile(dto.artworkFile);
    const metadataJson = {
      name: dto.metadata.name, description: dto.metadata.description, image: `ipfs://${artworkCid}`,
      attributes: [{ trait_type: "Series", value: dto.metadata.series }, { trait_type: "NFC Chip", value: dto.nfcChipUID }, { trait_type: "Creator DID", value: creator.did }],
      created_at: new Date().toISOString(),
    };
    const metadataCid = await this.ipfsService.uploadJson(JSON.stringify(metadataJson));

    // 只预处理，不调链。返回参数给前端用于 MetaMask 调用
    return {
      creatorAddress: dto.creatorAddress, nfcChipUID: dto.nfcChipUID, nfcHash,
      metadataCid, artworkCid, creatorDid: creator.did,
      readyForChain: true,
    };
  }

  async listOriginalWorks(page = 1, pageSize = 20, creatorAddress?: string) {
    const where: any = {};
    if (creatorAddress) where.creatorAddress = creatorAddress.toLowerCase();
    const [total, items] = await Promise.all([this.prisma.originalWork.count({ where }), this.prisma.originalWork.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } })]);
    return { total, page, pageSize, items };
  }

  async getOriginalDetail(tokenId: number) {
    const work = await this.prisma.originalWork.findFirst({ where: { tokenId } });
    if (!work) throw new NotFoundException("Original work not found");
    const derivatives = await this.prisma.derivative.findMany({ where: { originalTokenId: tokenId }, orderBy: { createdAt: "desc" } });
    const policyRecord = await this.prisma.policy.findFirst({ where: { originalTokenId: tokenId, isActive: true }, orderBy: { createdAt: "desc" } });
    const config: any = policyRecord?.configJson || {};
    const policy = policyRecord ? {
      allowsDerivative: config.allowsDerivative ?? true,
      allowedTypes: config.allowedTypes || [],
      royaltyBps: config.royaltyBps || 0,
      maxSupply: config.maxSupply || 0,
      currentSupply: 0,
      requireNfc: config.requireNfc || false,
      expireTime: config.expireTimestamp ? new Date(config.expireTimestamp * 1000).toISOString() : null,
      allowCommercial: config.allowCommercial || false,
    } : null;
    return { ...work, artworkUrl: this.ipfsService.getGatewayUrl(work.artworkCid), metadataUrl: this.ipfsService.getGatewayUrl(work.metadataCid), policy, derivatives };
  }
}