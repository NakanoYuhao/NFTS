'use client';

import { Button } from '@/components/ui/button';
import { PageType } from '@/types';

interface PlaceholderPageProps {
  title: string;
  onNavigate: (page: PageType) => void;
  backPage: PageType;
}

export function PlaceholderPage({ title, onNavigate, backPage }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          onClick={() => onNavigate(backPage)}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          ← 返回
        </Button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">{title}</h1>
        <div className="w-20" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
        <span className="text-6xl">🚧</span>
        <p className="text-lg">功能开发中...</p>
      </div>
    </div>
  );
}
