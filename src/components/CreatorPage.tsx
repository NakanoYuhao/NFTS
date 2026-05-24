'use client';

import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { CreateMode, PageType } from '@/types';

interface CreatorPageProps {
  onNavigate: (page: PageType) => void;
  onSelectMode: (mode: CreateMode) => void;
}

export function CreatorPage({ onNavigate, onSelectMode }: CreatorPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          onClick={() => onNavigate('home')}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          ← 返回
        </Button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">创作者模式</h1>
        <div className="w-20" />
      </div>

      {/* 主体 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        <p className="text-gray-400 text-center">选择你的创作方式</p>
        
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {/* 万物潮玩 - 较大按钮 */}
          <button
            onClick={() => onSelectMode('photo')}
            className="w-full py-8 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xl rounded-2xl shadow-md shadow-teal-200 hover:shadow-lg hover:shadow-teal-300 transition-all hover:-translate-y-0.5"
          >
            <div className="text-3xl mb-2">📸</div>
            万物潮玩
          </button>

          {/* 自由创作 - 较小按钮 */}
          <button
            onClick={() => onSelectMode('free')}
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg rounded-2xl shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300 transition-all hover:-translate-y-0.5"
          >
            <div className="text-2xl mb-1">✏️</div>
            自由创作
          </button>
        </div>
      </div>

      <BottomNav currentPage="creator" onNavigate={onNavigate} />
    </div>
  );
}
