'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collectible, PageType, ChatMessage } from '@/types';

interface ChatPageProps {
  collectible: Collectible;
  onNavigate: (page: PageType) => void;
  onUpdateMemory: (id: string, memory: ChatMessage[]) => void;
}

export function ChatPage({ collectible, onNavigate, onUpdateMemory }: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => 
    (collectible.memory || []).map((msg, idx) => ({
      id: `${collectible.id}-msg-${idx}`,
      role: (idx % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg,
      timestamp: new Date().toISOString(),
    }))
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const name = collectible.name || collectible.intro?.split(' - ')[0] || '潮玩';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = { 
      id: `msg-${Date.now()}`, 
      role: 'user', 
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          persona: collectible.persona,
          personaProtocol: collectible.personaProtocol || '',
          memory: collectible.memory || [],
          history: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = { id: `msg-${Date.now() + 1}`, role: 'assistant', content: data.message, timestamp: new Date().toISOString() };
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        onUpdateMemory(collectible.id, updatedMessages);
      } else {
        throw new Error(data.error || '对话失败');
      }
    } catch (error) {
      console.error('对话失败:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '抱歉，我现在有点累了，稍后再聊吧~',
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      onUpdateMemory(collectible.id, updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          onClick={() => onNavigate('detail')}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          ← 返回
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-gray-900">与 {name} 对话</h1>
        </div>
        <div className="w-20" />
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-300 mt-20">
            <p className="text-5xl mb-4">💬</p>
            <p>和 {name} 打个招呼吧</p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-sm text-sm">
              正在输入...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-100 p-4 bg-white">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入消息..."
            className="flex-1 bg-gray-50 border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6"
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
