import { Module } from '@nestjs/common';
import { IpAssetService } from './ip-asset.service';
import { IpAssetController } from './ip-asset.controller';

@Module({
  controllers: [IpAssetController],
  providers: [IpAssetService],
  exports: [IpAssetService],
})
export class IpAssetModule {}
