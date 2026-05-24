import { NextRequest, NextResponse } from 'next/server';
import { GENERATE_FREE_SYSTEM, generateFreeUser, FALLBACK_CONTENT } from '@/lib/prompts';
import { isCozeAvailable, generateLocalContent } from '@/lib/coze-local';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, intro } = body;

    if (!name || !intro) {
      return NextResponse.json(
        { success: false, error: '请填写名称和一句话介绍' },
        { status: 400 }
      );
    }

    // 本地开发降级
    if (!isCozeAvailable()) {
      const local = generateLocalContent(name, intro);
      return NextResponse.json({ success: true, data: { name, intro, ...local } });
    }

    const { LLMClient, Config, HeaderUtils } = await import('coze-coding-dev-sdk');

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 从外部提示词文件读取提示词
    const messages = [
      {
        role: 'system' as const,
        content: GENERATE_FREE_SYSTEM,
      },
      {
        role: 'user' as const,
        content: generateFreeUser(name, intro),
      },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      thinking: 'disabled',
      temperature: 0.8,
    });

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
        appearance: content.appearance || '',
        story: content.story || '',
        character: content.character || '',
      },
    });
  } catch (error) {
    console.error('AI补全失败:', error);
    return NextResponse.json(
      { success: false, error: '补全失败，请重试' },
      { status: 500 }
    );
  }
}
