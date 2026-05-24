'use client';

import { PageType } from '@/types';

interface BottomNavProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const navItems: { page: PageType; icon: string; label: string }[] = [
  { page: 'creator', icon: '🎨', label: '创作' },
  { page: 'collection', icon: '💎', label: '藏品柜' },
  { page: 'price-monitor', icon: '📊', label: '价格监控' },
  { page: 'user', icon: '👤', label: '用户' },
];

const activePages = new Set<PageType>([
  'creator',
  'collection',
  'price-monitor',
  'user',
  'create-photo',
  'create-free',
]);

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  // 仅在底部导航覆盖的页面显示
  if (!activePages.has(currentPage)) return null;

  return (
    <div className="border-t border-gray-100 bg-white">
      <div className="flex justify-around py-4">
        {navItems.map(({ page, icon, label }) => {
          // 高亮与当前页匹配的项（create-photo/create-free 视为创作页）
          const isActive =
            currentPage === page ||
            ((currentPage === 'create-photo' || currentPage === 'create-free') &&
              page === 'creator');
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
                isActive
                  ? 'text-teal-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
