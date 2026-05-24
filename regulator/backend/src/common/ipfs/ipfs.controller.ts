import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IpfsService } from './ipfs.service';

@ApiTags('IPFS 存储')
@Controller('api/ipfs')
export class IpfsController {
  constructor(private ipfsService: IpfsService) {}

  @Post('upload-json')
  @ApiOperation({ summary: '上传 JSON 数据到 IPFS' })
  async uploadJson(@Body('data') data: string) {
    const cid = await this.ipfsService.uploadJson(data);
    return { cid };
  }
}
