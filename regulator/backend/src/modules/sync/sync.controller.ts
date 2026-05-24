import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('链上同步')
@Controller('api/sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('did')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步 DID 注册（前端完成链上注册后调用）' })
  async syncDid(@Body() dto: any) {
    return this.syncService.syncDidRegistration(dto);
  }

  @Post('mint')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步 NFT 铸造（前端完成链上铸造后调用）' })
  async syncMint(@Body() dto: any) {
    return this.syncService.syncMint(dto);
  }

  @Post('policy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步规则设定（前端完成链上规则设定后调用）' })
  async syncPolicy(@Body() dto: any) {
    return this.syncService.syncPolicy(dto);
  }

  @Post('derivative')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步衍生品提交（前端完成链上提交后调用）' })
  async syncDerivative(@Body() dto: any) {
    return this.syncService.syncDerivative(dto);
  }
}
