import { Injectable, NotFoundException } from "@nestjs/common";
import { IpfsService } from "../../common/ipfs/ipfs.service";
import { PrismaService } from "../../config/prisma.service";

@Injectable()
export class DerivativeService {
  constructor(private ipfsService: IpfsService, private prisma: PrismaService) {}

  async traceDerivative(derivativeTokenId: number) {
    const derivative = await this.prisma.derivative.findFirst({ where: { tokenId: derivativeTokenId } });
    if (!derivative) throw new NotFoundException("Derivative not found");
    const original = await this.prisma.originalWork.findFirst({ where: { tokenId: derivative.originalTokenId } });
    const originalCreator = original ? await this.prisma.creator.findUnique({ where: { address: original.creatorAddress } }) : null;
    return {
      derivative: { ...derivative, metadataUrl: this.ipfsService.getGatewayUrl(derivative.metadataCid || "") },
      chainVerified: derivative.status === "MINTED", licenseId: null,
      original: original ? { ...original, creatorDid: originalCreator?.did, metadataUrl: this.ipfsService.getGatewayUrl(original.metadataCid) } : null,
      policy: null,
    };
  }

  async listDerivatives(page = 1, pageSize = 20, filters?: { originalTokenId?: number; creatorAddress?: string; status?: string }) {
    const where: any = {};
    if (filters?.originalTokenId) where.originalTokenId = filters.originalTokenId;
    if (filters?.creatorAddress) where.creatorAddress = filters.creatorAddress.toLowerCase();
    if (filters?.status) where.status = filters.status;
    const [total, items] = await Promise.all([this.prisma.derivative.count({ where }), this.prisma.derivative.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } })]);
    return { total, page, pageSize, items };
  }

  async freezeDerivative(tokenId: number, operator: string) {
    const derivative = await this.prisma.derivative.findFirst({ where: { tokenId } });
    if (!derivative) throw new NotFoundException("Derivative not found");

    await this.prisma.derivative.update({ where: { id: derivative.id }, data: { status: "FROZEN" } });

    await this.prisma.auditLog.create({
      data: {
        operator: operator.toLowerCase(),
        action: "FREEZE_DERIVATIVE",
        target: `derivative:${tokenId}`,
        detailJson: JSON.stringify({ originalTokenId: derivative.originalTokenId }),
      },
    });

    return { success: true, tokenId };
  }
}