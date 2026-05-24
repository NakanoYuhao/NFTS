// 必须在所有 ethers 导入之前设置 fetch polyfill
import fetch from 'cross-fetch';
(globalThis as any).fetch = fetch;

// BigInt JSON 序列化支持（Prisma BigInt 字段需要）
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 增大 body 大小限制（支持包含 base64 图片的大请求体）
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 安全中间件
  app.use(helmet.default());
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: true,  // 允许所有来源（Coze 部署 + 本地开发）
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API 文档
  const config = new DocumentBuilder()
    .setTitle('NFC 潮玩二创监管平台 API')
    .setDescription('基于区块链的 DID + 智能合约二创监管系统')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`[NFC Guard] Server running on http://localhost:${port}`);
  console.log(`[NFC Guard] Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();

