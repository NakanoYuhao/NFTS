// ============================================================
// GET /api/storage/load — 下载 .onft 文件（预留）
// TODO: 接入真实存储服务后实现
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // TODO: 实现以下逻辑
  // 1. 从 searchParams 获取 id
  // 2. 从服务端持久存储中读取 .onft 文件
  // 3. 返回 .onft 文件二进制流

  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '缺少 id 参数' },
      { status: 400 }
    );
  }

  // TODO: 真实加载逻辑
  // 当前返回成功状态，指示功能尚未实现
  return NextResponse.json({
    success: true,
    data: {
      id,
      message: '服务端存储尚未实现，当前仅支持本地存储',
    },
  });
}
