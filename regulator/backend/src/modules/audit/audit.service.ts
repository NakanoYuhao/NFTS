import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async listLogs(page = 1, pageSize = 50, filters?: {
    operator?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (filters?.operator) where.operator = filters.operator.toLowerCase();
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async getStats() {
    const [totalActions, uniqueOperators, actionBreakdown] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['operator'],
        _count: { operator: true },
        orderBy: { _count: { operator: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
    ]);

    return {
      totalActions,
      uniqueOperators: uniqueOperators.length,
      topOperators: uniqueOperators.map(o => ({
        operator: o.operator,
        count: o._count.operator,
      })),
      actionBreakdown: actionBreakdown.map(a => ({
        action: a.action,
        count: a._count.action,
      })),
    };
  }
}
