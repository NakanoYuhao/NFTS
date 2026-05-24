// ============================================================
// GET /api/nft/indexer — 查询索引器状态与配置信息
//
// 用于前端检测当前可用的链上数据源、配置状态等
// ============================================================

import { NextResponse } from 'next/server';
import { getAvailableSource } from '@/lib/nft-indexer';

export async function GET() {
  const source = getAvailableSource();

  const configStatus = {
    alchemy: !!process.env.ALCHEMY_API_KEY,
    contract: !!(process.env.BLOCKCHAIN_RPC_URL && process.env.NFT_CONTRACT_ADDRESS),
    pinata: !!(process.env.PINATA_JWT || (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY)),
  };

  // 合约地址脱敏显示
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  const maskedContract = contractAddress
    ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`
    : null;

  return NextResponse.json({
    success: true,
    data: {
      availableSource: source,
      configStatus,
      contractAddress: maskedContract,
      chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '0x13882',
      // 前端可根据此字段决定是否显示同步按钮
      syncAvailable: source !== null,
    },
  });
}
