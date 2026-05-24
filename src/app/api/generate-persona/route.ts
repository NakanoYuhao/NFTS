import { NextRequest, NextResponse } from 'next/server';
import { type Message } from 'coze-coding-dev-sdk';
import {
  GENERATE_PERSONA_SYSTEM,
  generatePersonaUser,
  generatePersonaUserWithImage,
  GENERATE_PROTOCOL_SYSTEM,
  generateProtocolUser,
  FALLBACK_PERSONA,
} from '@/lib/prompts';
import { isCozeAvailable, generateLocalPersona } from '@/lib/coze-local';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appearance, story, character, imageUrl, name, intro } = body as {
      appearance: string;
      story: string;
      character: string;
      imageUrl?: string;
      name?: string;
      intro?: string;
    };

    // 本地开发降级
    if (!isCozeAvailable()) {
      const persona = generateLocalPersona();
      return NextResponse.json({
        success: true,
        data: {
          persona,
          protocol: `${persona}\n\n请根据以上人格设定，以潮玩数字生命的身份与用户进行友好、富有创意的对话。`,
        },
      });
    }

    const { LLMClient, Config, HeaderUtils } = await import('coze-coding-dev-sdk');

    if (!appearance || !story || !character) {
      return NextResponse.json(
        { success: false, error: '缺少外表描述、背景故事或性格特征' },
        { status: 400 }
      );
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // ---- Phase 1: 生成人格锚点 ----
    // 根据是否有图片URL选择不同的消息构造方式
    let personaMessages: Message[];

    if (imageUrl) {
      // 有图片：使用多模态消息，按女娲蒸馏方法论分析图片视觉线索
      const userText = generatePersonaUserWithImage(
        appearance,
        story,
        character,
        name || '',
        intro || ''
      );

      personaMessages = [
        {
          role: 'system',
          content: GENERATE_PERSONA_SYSTEM,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ];
    } else {
      // 无图片：纯文本蒸馏
      personaMessages = [
        {
          role: 'system',
          content: GENERATE_PERSONA_SYSTEM,
        },
        {
          role: 'user',
          content: generatePersonaUser(appearance, story, character),
        },
      ];
    }

    // 生成人格锚点（使用多模态模型以支持图片理解）
    let personaResponse;
    try {
      personaResponse = await client.invoke(personaMessages, {
        model: 'doubao-seed-2-0-pro-260215',
        thinking: 'disabled',
        temperature: 0.7,
      });
    } catch (invokeError) {
      console.error('doubao-seed-2-0-pro 调用失败，尝试降级:', invokeError instanceof Error ? invokeError.message : String(invokeError));
      // 降级：换模型重试
      try {
        personaResponse = await client.invoke(personaMessages, {
          model: 'doubao-seed-1-8-251228',
          thinking: 'disabled',
          temperature: 0.7,
        });
      } catch (retryError) {
        console.error('降级模型也失败:', retryError instanceof Error ? retryError.message : String(retryError));
        throw retryError;
      }
    }

    const persona = personaResponse.content.trim() || FALLBACK_PERSONA;

    // ---- Phase 2: 基于人格锚点生成人格输出控制指令（Agentic Protocol） ----
    let personaProtocol = '';

    try {
      const protocolMessages: Message[] = [
        {
          role: 'system',
          content: GENERATE_PROTOCOL_SYSTEM,
        },
        {
          role: 'user',
          content: generateProtocolUser(persona, name || '', intro || ''),
        },
      ];

      const protocolResponse = await client.invoke(protocolMessages, {
        model: 'doubao-seed-2-0-lite-260215',
        thinking: 'disabled',
        temperature: 0.5,
      });

      personaProtocol = protocolResponse.content.trim();
    } catch (protocolError) {
      console.error('人格输出控制指令生成失败，使用空协议:', protocolError instanceof Error ? protocolError.message : String(protocolError));
      // 降级：空协议，对话时仅依赖人格锚点
      personaProtocol = '';
    }

    return NextResponse.json({
      success: true,
      persona,
      personaProtocol,
    });
  } catch (error) {
    console.error('生成人格锚点失败:', error);
    return NextResponse.json({
      success: true,
      persona: FALLBACK_PERSONA,
      personaProtocol: '',
      warning: '人格锚点生成服务暂时不可用，已使用默认人格',
    });
  }
}
