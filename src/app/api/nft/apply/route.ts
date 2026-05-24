import { NextResponse } from 'next/server';
import { getServerContractAddress, getCurrentChainConfig } from '@/lib/nft-contract';

/**
 * POST /api/nft/apply
 * 校验藏品数据并返回合约配置信息
 *
 * 无合规审查流程，直接校验数据完整性后返回合约配置。
 * 实际铸造由前端通过用户钱包直接调用智能合约完成。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { collectibleId, collectibleData } = body as {
      collectibleId: string;
      collectibleData?: {
        name?: string;
        intro?: string;
        appearance?: string;
        story?: string;
        character?: string;
        sprites?: string;
        persona?: string;
        did?: string;
        metadata?: {
          createdAt: string;
          author: string;
        };
      };
    };

    if (!collectibleId) {
      return NextResponse.json(
        { success: false, error: '缺少藏品ID' },
        { status: 400 }
      );
    }

    // 校验藏品数据完整性（非审查，仅校验必要字段）
    const missing: string[] = [];
    if (!collectibleData?.name) missing.push('名称');
    if (!collectibleData?.intro) missing.push('一句话介绍');
    if (!collectibleData?.story) missing.push('背景故事');
    if (!collectibleData?.character) missing.push('性格特征');

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `藏品信息不完整，缺少：${missing.join('、')}` },
        { status: 400 }
      );
    }

    // 获取合约配置
    const contractAddress = getServerContractAddress();
    const chainConfig = getCurrentChainConfig();

    return NextResponse.json({
      success: true,
      data: {
        collectibleId,
        contractAddress: contractAddress || null,
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        contractReady: !!contractAddress,
        message: contractAddress
          ? '数据校验通过，请通过钱包完成链上铸造。'
          : '数据校验通过，但 NFT 合约地址未配置。请设置合约地址后重试。',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '校验失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
