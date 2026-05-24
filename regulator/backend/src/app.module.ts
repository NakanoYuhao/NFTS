import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { DidModule } from './modules/did/did.module';
import { IpAssetModule } from './modules/ip-asset/ip-asset.module';
import { PolicyModule } from './modules/policy/policy.module';
import { DerivativeModule } from './modules/derivative/derivative.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IpfsModule } from './common/ipfs/ipfs.module';
import { PrismaModule } from './config/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    // ChainModule 已移除——合约交互全由前端 MetaMask 完成
    IpfsModule,
    AuthModule,
    DidModule,
    IpAssetModule,
    PolicyModule,
    DerivativeModule,
    SyncModule,
    AuditModule,
    DashboardModule,
  ],
})
export class AppModule {}
