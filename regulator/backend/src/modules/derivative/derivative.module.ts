import { Module } from '@nestjs/common';
import { DerivativeService } from './derivative.service';
import { DerivativeController } from './derivative.controller';

@Module({
  controllers: [DerivativeController],
  providers: [DerivativeService],
  exports: [DerivativeService],
})
export class DerivativeModule {}
