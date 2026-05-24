// ============================================================
// POST /api/storage/save — 上传 .onft 文件到服务器（预留）
// TODO: 接入真实存储服务后实现
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // TODO: 实现以下逻辑
  // 1. 从 request 中读取 FormData（包含 .onft 文件）
  // 2. 解包 .onft 文件，校验元数据完整性
  // 3. 将 .onft 文件保存到服务端持久存储（如数据库、对象存储等）
  // 4. 返回保存结果 { id, url }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { success: false, error: '缺少文件' },
        { status: 400 }
      );
    }

    // TODO: 真实保存逻辑
    // 当前返回成功状态，指示功能尚未实现
    return NextResponse.json({
      success: true,
      data: {
        id: 'stub',
        url: '',
        message: '服务端存储尚未实现，当前仅支持本地存储',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '保存失败' },
      { status: 500 }
    );
  }
}
