import { NextRequest, NextResponse } from 'next/server';
import { chatSystemPrompt, FALLBACK_CHAT_MESSAGES } from '@/lib/prompts';
import { isCozeAvailable, generateLocalChatReply } from '@/lib/coze-local';

interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, persona, memory = [], history = [], personaProtocol = '' } = body as {
      message: string;
      persona: string;
      memory: string[];
      history: ChatHistory[];
      personaProtocol?: string;
    };

    // 本地开发降级
    if (!isCozeAvailable()) {
      return NextResponse.json({
        success: true,
        message: generateLocalChatReply(),
      });
    }

    const { LLMClient, Config, HeaderUtils } = await import('coze-coding-dev-sdk');

    if (!message || !persona) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 初始化LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建记忆上下文：将 string[] 格式的 memory 转换为对话历史
    // memory 中偶数索引为 user，奇数索引为 assistant
    const memoryHistory: ChatHistory[] = memory.map((msg: string, idx: number) => ({
      role: idx % 2 === 0 ? 'user' : 'assistant',
      content: msg,
    }));

    // 从外部提示词文件读取提示词 — 对话仅使用 persona，不使用 story/character 等其他信息
    const messages = [
      {
        role: 'system' as const,
        content: chatSystemPrompt(persona, memoryHistory, personaProtocol),
      },
      ...history.map((h: ChatHistory) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // 调用AI生成回复（不启用深度思考，快速响应）
    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      thinking: 'disabled',
      temperature: 0.8,
    });

    return NextResponse.json({
      success: true,
      message: response.content,
    });
  } catch (error) {
    console.error('对话失败:', error);
    
    // 返回降级回复
    const fallbackIndex = Math.floor(Math.random() * FALLBACK_CHAT_MESSAGES.length);
    return NextResponse.json({
      success: true,
      message: FALLBACK_CHAT_MESSAGES[fallbackIndex],
      warning: 'AI服务暂时不可用',
    });
  }
}
