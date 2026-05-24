import { NextRequest, NextResponse } from 'next/server';
import { GENERATE_CONTENT_SYSTEM, generateContentUser, FALLBACK_CONTENT } from '@/lib/prompts';
import { isCozeAvailable, generateLocalContent } from '@/lib/coze-local';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const name = formData.get('name') as string;
    const intro = formData.get('intro') as string;

    if (!imageFile || !name || !intro) {
      return NextResponse.json(
        { success: false, error: '请上传图片、填写名称和介绍' },
        { status: 400 }
      );
    }

    // 本地开发降级：Coze SDK 不可用时返回本地生成内容
    if (!isCozeAvailable()) {
      const local = generateLocalContent(name, intro);
      return NextResponse.json({ success: true, data: { name, intro, ...local } });
    }

    const { LLMClient, Config, HeaderUtils, S3Storage } = await import('coze-coding-dev-sdk');

    // 将图片上传到S3，获取HTTP URL（LLM API不支持data: URI）
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `content-gen/${Date.now()}_${imageFile.name}`,
      contentType: imageFile.type || 'image/jpeg',
    });

    const imageUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 3600,
    });

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 从外部提示词文件读取提示词，使用HTTP URL传入图片
    const messages = [
      {
        role: 'system' as const,
        content: GENERATE_CONTENT_SYSTEM,
      },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: generateContentUser(name, intro) },
          {
            type: 'image_url' as const,
            image_url: {
              url: imageUrl,
              detail: 'high' as const,
            },
          },
        ],
      },
    ];

    // 调用AI生成内容（使用豆包旗舰多模态模型）
    let response;
    try {
      response = await client.invoke(messages, {
        model: 'doubao-seed-2-0-pro-260215',
        thinking: 'disabled',
        temperature: 0.8,
      });
    } catch (invokeError) {
      console.error('doubao-seed-2-0-pro 调用失败，尝试降级:', invokeError instanceof Error ? invokeError.message : String(invokeError));
      // 降级：换模型重试
      try {
        response = await client.invoke(messages, {
          model: 'doubao-seed-1-8-251228',
          temperature: 0.8,
        });
      } catch (retryError) {
        console.error('降级模型也失败:', retryError instanceof Error ? retryError.message : String(retryError));
        throw retryError;
      }
    }

    // 解析AI响应
    let content;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析AI响应');
      }
    } catch (parseError) {
      console.error('解析失败:', parseError);
      content = { ...FALLBACK_CONTENT };
    }

    return NextResponse.json({
      success: true,
      data: {
        name,
        intro,
        appearance: content.appearance || '',
        story: content.story || '',
        character: content.character || '',
      },
    });
  } catch (error) {
    console.error('生成内容失败:', error instanceof Error ? error.message : String(error));
    console.error('错误堆栈:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { success: false, error: '生成失败，请重试', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
