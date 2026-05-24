import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DidService } from './did.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('DID 身份')
@Controller('api/did')
export class DidController {
  constructor(private didService: DidService) {}

  @Post('register')
  @ApiOperation({ summary: '注册创作者 DID' })
  async registerDid(@Body('address') address: string) {
    return this.didService.createDid(address);
  }

  @Post('issue-vc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '签发创作者认证 VC（管理员）' })
  async issueVC(@Body('creatorAddress') creatorAddress: string) {
    return this.didService.issueCreatorVC('admin', creatorAddress);
  }

  @Get('creator/:address')
  @ApiOperation({ summary: '查询创作者 DID 信息' })
  async getCreator(@Param('address') address: string) {
    return this.didService.getCreator(address);
  }

  @Get('resolve/:didOrAddress')
  @ApiOperation({ summary: '解析 DID 文档' })
  async resolveDid(@Param('didOrAddress') didOrAddress: string) {
    return this.didService.resolveDid(didOrAddress);
  }
}
