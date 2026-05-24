import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [
      totalCreators,
      totalOriginals,
      totalDerivatives,
      totalPolicies,
      frozenCount,
      recentDerivatives,
    ] = await Promise.all([
      this.prisma.creator.count({ where: { isVerified: true } }),
      this.prisma.originalWork.count(),
      this.prisma.derivative.count(),
      this.prisma.policy.count({ where: { isActive: true } }),
      this.prisma.derivative.count({ where: { status: 'FROZEN' } }),
      this.prisma.derivative.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { tokenId: true, creatorAddress: true, derivativeType: true, createdAt: true },
      }),
    ]);

    return {
      totalCreators,
      totalOriginals,
      totalDerivatives,
      totalPolicies,
      frozenCount,
      recentDerivatives,
    };
  }

  async getTrends() {
    // 近 7 天每日统计
    const days = 7;
    const results: any[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const [originals, derivatives] = await Promise.all([
        this.prisma.originalWork.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        this.prisma.derivative.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
      ]);

      results.push({
        date: start.toISOString().split('T')[0],
        originals,
        derivatives,
      });
    }

    return results;
  }
}
