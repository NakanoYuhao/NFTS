// ============================================================
// DELETE /api/storage/delete — 删除服务端藏品（预留）
// TODO: 接入真实存储服务后实现
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  // TODO: 实现以下逻辑
  // 1. 从 request body 获取 id
  // 2. 从服务端持久存储中删除对应的 .onft 文件和元数据
  // 3. 返回删除结果

  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少 id 参数' },
        { status: 400 }
      );
    }

    // TODO: 真实删除逻辑
    // 当前返回成功状态，指示功能尚未实现
    return NextResponse.json({
      success: true,
      data: {
        message: '服务端存储尚未实现，当前仅支持本地存储',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
