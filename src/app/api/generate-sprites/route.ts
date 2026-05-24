import { NextRequest, NextResponse } from 'next/server';
import { generateSpritesPrompt } from '@/lib/prompts';
import { isCozeAvailable } from '@/lib/coze-local';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, intro, appearance, story, character, imageUrl } = body;

    if (!name || !intro) {
      return NextResponse.json(
        { success: false, error: '缺少名称和介绍' },
        { status: 400 }
      );
    }

    // 本地开发降级：返回 placeholder 图片
    if (!isCozeAvailable()) {
      const placeholderUrl = `https://placehold.co/512x512/14b8a6/ffffff?text=${encodeURIComponent(name.slice(0, 4))}`;
      return NextResponse.json({
        success: true,
        data: { sprites: [placeholderUrl, placeholderUrl, placeholderUrl, placeholderUrl] },
      });
    }

    const { ImageGenerationClient, Config, HeaderUtils } = await import('coze-coding-dev-sdk');

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化图片生成客户端
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 从外部提示词文件读取提示词，包含名称+介绍+外表+故事+性格
    // 图生图模式下使用专门的提示词，要求参考原始照片
    const prompt = generateSpritesPrompt(
      name,
      intro,
      appearance || '',
      story || '',
      character || '',
      !!imageUrl
    );

    // 构建生成请求：万物潮玩模式下传入原始图片作为参考（图生图）
    const generateRequest: Parameters<typeof client.generate>[0] = {
      prompt,
      size: '2K',
      watermark: false,
    };

    if (imageUrl) {
      generateRequest.image = imageUrl;
    }

    // 调用图片生成API
    const response = await client.generate(generateRequest);

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls.length > 0) {
      return NextResponse.json({
        success: true,
        spritesUrl: helper.imageUrls[0],
      });
    } else {
      throw new Error(helper.errorMessages.join(', ') || '生成失败');
    }
  } catch (error) {
    console.error('生成藏品失败:', error);
    
    // 返回一个默认的占位图URL
    const placeholderUrl = 'https://via.placeholder.com/512x512/14b8a6/ffffff?text=NFT';
    
    return NextResponse.json({
      success: true,
      spritesUrl: placeholderUrl,
      warning: '图片生成服务暂时不可用，已使用默认图片',
    });
  }
}
