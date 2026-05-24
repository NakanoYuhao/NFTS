import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

const CONTRACT_ADDRS = {
  OriginalWork: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  DerivativeNFT: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
};

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  /// 前端完成链上 DID 注册后同步
  async syncDidRegistration(dto: {
    address: string;
    did: string;
    didHash: string;
    didCid: string;
    txHash: string;
    isVerified?: boolean;
  }) {
    await this.prisma.creator.upsert({
      where: { address: dto.address.toLowerCase() },
      update: {
        did: dto.did,
        didHash: dto.didHash,
        didCid: dto.didCid,
        registeredAt: new Date(),
        ...(dto.isVerified !== undefined ? { isVerified: dto.isVerified } : {}),
      },
      create: {
        address: dto.address.toLowerCase(),
        did: dto.did,
        didHash: dto.didHash,
        didCid: dto.didCid,
        isVerified: dto.isVerified || false,
        registeredAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        operator: dto.address.toLowerCase(),
        action: 'REGISTER_DID',
        target: dto.did,
        txHash: dto.txHash,
      },
    });

    this.logger.log(`DID synced: ${dto.did}`);
    return { success: true };
  }

  /// 前端完成链上 NFT 铸造后同步
  async syncMint(dto: {
    creatorAddress: string;
    tokenId: number;
    nfcChipUID: string;
    metadataCid: string;
    artworkCid: string;
    txHash: string;
  }) {
    const contractAddr = CONTRACT_ADDRS.OriginalWork;

    await this.prisma.originalWork.create({
      data: {
        tokenId: dto.tokenId,
        contractAddress: contractAddr,
        creatorAddress: dto.creatorAddress.toLowerCase(),
        nfcChipUID: dto.nfcChipUID,
        metadataCid: dto.metadataCid,
        artworkCid: dto.artworkCid,
        txHash: dto.txHash,
        status: 'MINTED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        operator: dto.creatorAddress.toLowerCase(),
        action: 'MINT_ORIGINAL',
        target: `tokenId:${dto.tokenId}`,
        txHash: dto.txHash,
      },
    });

    this.logger.log(`Mint synced: tokenId=${dto.tokenId}`);
    return { success: true };
  }

  /// 前端完成规则设定后同步
  async syncPolicy(dto: {
    creatorAddress: string;
    originalTokenId: number;
    ruleHash: string;
    configJson: object;
    txHash: string;
  }) {
    await this.prisma.policy.create({
      data: {
        originalTokenId: dto.originalTokenId,
        creatorAddress: dto.creatorAddress.toLowerCase(),
        ruleHash: dto.ruleHash,
        configJson: dto.configJson,
        txHash: dto.txHash,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        operator: dto.creatorAddress.toLowerCase(),
        action: 'SET_POLICY',
        target: `originalTokenId:${dto.originalTokenId}`,
        txHash: dto.txHash,
      },
    });

    this.logger.log(`Policy synced: tokenId=${dto.originalTokenId}`);
    return { success: true };
  }

  /// 前端完成衍生品提交后同步
  async syncDerivative(dto: {
    creatorAddress: string;
    derivativeTokenId: number;
    originalTokenId: number;
    derivativeType: string;
    metadataCid: string;
    artworkCid: string;
    nfcChipUID?: string;
    txHash: string;
  }) {
    const contractAddr = CONTRACT_ADDRS.DerivativeNFT;

    await this.prisma.derivative.create({
      data: {
        tokenId: dto.derivativeTokenId,
        contractAddress: contractAddr,
        originalTokenId: dto.originalTokenId,
        creatorAddress: dto.creatorAddress.toLowerCase(),
        derivativeType: dto.derivativeType,
        metadataCid: dto.metadataCid,
        artworkCid: dto.artworkCid,
        nfcChipUID: dto.nfcChipUID || null,
        txHash: dto.txHash,
        status: 'MINTED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        operator: dto.creatorAddress.toLowerCase(),
        action: 'SUBMIT_DERIVATIVE',
        target: `derivative:${dto.derivativeTokenId}`,
        txHash: dto.txHash,
        detailJson: JSON.stringify({
          originalTokenId: dto.originalTokenId,
          derivativeType: dto.derivativeType,
        }),
      },
    });

    this.logger.log(`Derivative synced: tokenId=${dto.derivativeTokenId}`);
    return { success: true };
  }
}
