import { NextResponse } from 'next/server';

/**
 * GET /api/nft/status?id=xxx
 * 查询 NFT-ID 申请状态
 *
 * 在新的真实铸造流程中，状态查询可直接从链上读取。
 * 本接口保留用于兼容前端轮询逻辑，后续可对接链上查询。
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少藏品ID' },
        { status: 400 }
      );
    }

    // 在真实铸造流程中，状态由前端的 wagmi hook 管理
    // 不再需要后端轮询，直接返回提示
    return NextResponse.json({
      success: true,
      data: {
        collectibleId: id,
        status: 'none' as const,
        message: '请使用前端钱包铸造流程完成 NFT 铸造。状态由链上交易实时确认。',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
