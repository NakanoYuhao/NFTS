import { NextRequest, NextResponse } from 'next/server';
import { isCozeAvailable } from '@/lib/coze-local';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer;
    let mimeType: string;

    if (contentType.includes('multipart/form-data')) {
      // FormData 方式：前端上传文件
      const formData = await request.formData();
      const imageFile = formData.get('image') as File | null;
      if (!imageFile) {
        return NextResponse.json(
          { success: false, error: '缺少图片文件' },
          { status: 400 }
        );
      }
      const arrayBuffer = await imageFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = imageFile.type || 'image/jpeg';
    } else if (contentType.includes('application/json')) {
      // JSON 方式：前端传 base64 data URL（透明化后的图片）
      const body = await request.json();
      const dataUrl: string = body.imageDataUrl;
      if (!dataUrl || !dataUrl.startsWith('data:')) {
        return NextResponse.json(
          { success: false, error: '缺少 imageDataUrl 字段' },
          { status: 400 }
        );
      }
      // 解析 data:image/png;base64,xxxxx
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { success: false, error: '无效的 data URL 格式' },
          { status: 400 }
        );
      }
      mimeType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的 Content-Type' },
        { status: 400 }
      );
    }

    // 本地开发降级：Coze SDK 不可用时返回 data URL 本身作为图片地址
    if (!isCozeAvailable()) {
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return NextResponse.json({ success: true, data: { url: dataUrl, key: 'local-dev' } });
    }

    const { S3Storage } = await import('coze-coding-dev-sdk');

    // 初始化S3存储
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    // 上传文件到S3
    const ext = mimeType.split('/')[1] || 'png';
    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `collectibles/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`,
      contentType: mimeType,
    });

    // 生成长期签名URL（7天有效）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 7 * 24 * 3600,
    });

    return NextResponse.json({
      success: true,
      imageUrl: signedUrl,
      key: fileKey,
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    return NextResponse.json(
      { success: false, error: '上传图片失败' },
      { status: 500 }
    );
  }
}
