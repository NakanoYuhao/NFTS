// ============================================================
// POST /api/storage/sync — 本地↔服务端同步（预留）
// TODO: 接入真实存储服务后实现
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // TODO: 实现以下逻辑
  // 1. 接收客户端传来的本地藏品 ID 列表
  // 2. 对比服务端存储的藏品列表
  // 3. 返回差异：需要上传的 ID 列表 + 需要下载的 ID 列表

  try {
    const body = await request.json();
    const { localIds } = body as { localIds?: string[] };

    if (!Array.isArray(localIds)) {
      return NextResponse.json(
        { success: false, error: '缺少 localIds 参数' },
        { status: 400 }
      );
    }

    // TODO: 真实同步逻辑
    // 当前返回成功状态，指示功能尚未实现
    return NextResponse.json({
      success: true,
      data: {
        toUpload: [],
        toDownload: [],
        message: '服务端存储尚未实现，当前仅支持本地存储',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '同步失败' },
      { status: 500 }
    );
  }
}
