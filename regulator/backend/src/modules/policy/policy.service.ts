import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { ethers } from "ethers";

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  // 前端用 MetaMask 调合约后调 /api/sync/policy 同步到这里
  async getPolicy(originalTokenId: number) {
    const offChain = await this.prisma.policy.findFirst({ where: { originalTokenId, isActive: true }, orderBy: { createdAt: "desc" } });
    const config: any = offChain?.configJson || {};
    return { allowsDerivative: config.allowsDerivative ?? true, allowedTypes: config.allowedTypes || [], royaltyBps: config.royaltyBps || 0, maxSupply: config.maxSupply || 0, currentSupply: 0, requireNfc: config.requireNfc || false, expireTime: null, allowCommercial: config.allowCommercial || false, offChainConfig: config };
  }

  async listPolicies(page = 1, pageSize = 20) {
    const where: any = { isActive: true };
    const [total, items] = await Promise.all([
      this.prisma.policy.count({ where }),
      this.prisma.policy.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
        select: { id: true, originalTokenId: true, creatorAddress: true, ruleHash: true, configJson: true, txHash: true, isActive: true, createdAt: true },
      }),
    ]);
    return { total, page, pageSize, items };
  }

  async getPolicyHistory(originalTokenId: number) {
    return this.prisma.policy.findMany({ where: { originalTokenId }, orderBy: { createdAt: "desc" }, select: { id: true, ruleHash: true, isActive: true, txHash: true, createdAt: true } });
  }
}