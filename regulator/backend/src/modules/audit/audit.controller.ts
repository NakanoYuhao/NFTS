import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('审计日志')
@Controller('api/audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询审计日志' })
  async listLogs(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('operator') operator?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.listLogs(Number(page), Number(pageSize), {
      operator, action, startDate, endDate,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '审计统计数据' })
  async getStats() {
    return this.auditService.getStats();
  }
}
