// ============================================================
// GET /api/nft/sync?address=0x... — 同步用户链上 .onft 藏品
// POST /api/nft/sync — 增量更新（对比本地与链上差异）
//
// 核心流程：
//   同步数据 (GET)：
//     1. 接收用户钱包地址
//     2. 通过链下索引器查询链上 NFT
//     3. 下载并校验 .onft 格式
//     4. 仅返回 .onft 格式的藏品
//
//   更新数据 (POST)：
//     1. 接收本地藏品 ID 列表 + 钱包地址
//     2. 查询链上最新数据
//     3. 对比差异（新增/更新/移除）
//     4. 返回差量结果
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  syncOnftCollectibles,
  computeSyncDiff,
  getAvailableSource,
} from '@/lib/nft-indexer';

/**
 * GET /api/nft/sync?address=0x...&contract=0x...
 * 同步用户链上 .onft 藏品
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const contract = searchParams.get('contract') || undefined;

    if (!address) {
      return NextResponse.json(
        { success: false, error: '缺少钱包地址参数 (address)' },
        { status: 400 },
      );
    }

    // 校验地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: '无效的钱包地址格式' },
        { status: 400 },
      );
    }

    // 检查数据源可用性
    const source = getAvailableSource();
    if (!source) {
      return NextResponse.json({
        success: true,
        data: {
          synced: [],
          skipped: [],
          errors: [],
          source: null,
          syncedAt: new Date().toISOString(),
          message: '未配置链上数据源。请设置 ALCHEMY_API_KEY、BLOCKCHAIN_RPC_URL 或 PINATA_JWT',
        },
      });
    }

    // 执行同步
    const result = await syncOnftCollectibles(address, contract);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '同步失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/nft/sync
 * 增量更新：对比本地与链上 .onft 藏品差异
 *
 * Body: {
 *   address: string;           // 用户钱包地址
 *   localItems: Collectible[]; // 本地已有的藏品列表
 *   contract?: string;         // 可选：限定合约地址
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      address?: string;
      localItems?: Array<{
        id: string;
        syncSource?: string;
        syncAt?: string;
        [key: string]: unknown;
      }>;
      contract?: string;
    };

    const { address, localItems = [], contract } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, error: '缺少钱包地址参数 (address)' },
        { status: 400 },
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: '无效的钱包地址格式' },
        { status: 400 },
      );
    }

    // 检查数据源
    const source = getAvailableSource();
    if (!source) {
      return NextResponse.json({
        success: true,
        data: {
          toAdd: [],
          toUpdate: [],
          toRemove: [],
          source: null,
          message: '未配置链上数据源',
        },
      });
    }

    // 查询链上最新数据
    const chainResult = await syncOnftCollectibles(address, contract);

    // 计算差异
    const diff = computeSyncDiff(localItems as unknown as Array<import('@/types').Collectible>, chainResult.synced);

    return NextResponse.json({
      success: true,
      data: {
        ...diff,
        source: chainResult.source,
        syncedAt: chainResult.syncedAt,
        // 附带完整的链上查询结果，方便前端调试
        _meta: {
          totalChainNfts: chainResult.synced.length + chainResult.skipped.length + chainResult.errors.length,
          onftCount: chainResult.synced.length,
          skippedCount: chainResult.skipped.length,
          errorCount: chainResult.errors.length,
          skipped: chainResult.skipped,
          errors: chainResult.errors,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
