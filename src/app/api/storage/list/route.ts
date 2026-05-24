// ============================================================
// GET /api/storage/list — 列出服务端所有藏品元数据（预留）
// TODO: 接入真实存储服务后实现
// ============================================================

import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: 实现以下逻辑
  // 1. 从服务端持久存储中查询当前用户的所有藏品元数据
  // 2. 返回元数据列表（不含图片，仅 id/name/intro 等摘要信息）

  // TODO: 真实查询逻辑
  // 当前返回成功状态，指示功能尚未实现
  return NextResponse.json({
    success: true,
    data: {
      items: [],
      message: '服务端存储尚未实现，当前仅支持本地存储',
    },
  });
}
