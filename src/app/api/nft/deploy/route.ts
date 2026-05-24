import { NextResponse } from 'next/server';
import {
  OPEN_NFT_BYTECODE,
  OPEN_NFT_DEPLOY_ABI,
  getCurrentChainConfig,
} from '@/lib/nft-contract';

/**
 * GET /api/nft/deploy
 *
 * 返回一键部署所需信息：
 * - 合约字节码
 * - 部署 ABI
 * - 构造函数参数
 * - 当前链配置
 *
 * 前端使用 wagmi deployContract 直接部署到用户钱包连接的链
 */
export async function GET() {
  const chainConfig = getCurrentChainConfig();

  return NextResponse.json({
    success: true,
    data: {
      bytecode: OPEN_NFT_BYTECODE,
      abi: OPEN_NFT_DEPLOY_ABI,
      constructorArgs: {
        name: 'OPEN-NFTs',
        symbol: 'ONFT',
      },
      chain: {
        chainId: chainConfig.chainId,
        name: chainConfig.name,
        blockExplorer: chainConfig.blockExplorer,
        nativeCurrency: chainConfig.nativeCurrency,
        rpcUrl: chainConfig.rpcUrl,
        faucetUrl: chainConfig.faucetUrl,
      },
    },
  });
}
