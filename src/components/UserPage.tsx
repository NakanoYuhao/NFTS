'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { PageType } from '@/types';

interface UserPageProps {
  onNavigate: (page: PageType) => void;
}

export function UserPage({ onNavigate }: UserPageProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          onClick={() => onNavigate('creator')}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          ← 返回
        </Button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">用户</h1>
        <div className="w-20" />
      </div>

      {/* 主体 */}
      <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
        {/* 头像区域 */}
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
          👤
        </div>

        {/* 钱包连接区域 */}
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="bg-gray-50 rounded-2xl p-6 flex flex-col items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">关联钱包</h2>
            <p className="text-sm text-gray-400 text-center">
              {isConnected
                ? '已关联钱包，可进行链上操作'
                : '连接钱包后可铸造 NFT、同步链上藏品'}
            </p>

            {isConnected && address ? (
              <div className="w-full flex flex-col gap-3">
                {/* 已连接状态 */}
                <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2">
                  <span className="text-xs text-gray-400">已关联地址</span>
                  <span className="text-sm font-mono text-gray-900 break-all">{address}</span>
                </div>
                <Button
                  onClick={() => disconnect()}
                  variant="outline"
                  className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  断开钱包
                </Button>
              </div>
            ) : (
              /* 未连接 - 使用 RainbowKit ConnectButton */
              <div className="w-full [&>div]:w-full [&_.connect-button]:w-full [&_.connect-button]:bg-teal-500 [&_.connect-button]:hover:bg-teal-600 [&_.connect-button]:rounded-xl [&_.connect-button]:text-white [&_.connect-button]:font-semibold [&_.connect-button]:py-3 [&_.connect-button]:text-base">
                <ConnectButton />
              </div>
            )}
          </div>
        </div>

        {/* 提示信息 */}
        {isConnected && (
          <div className="w-full max-w-sm">
            <div className="bg-teal-50 rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg">✅</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-teal-700">钱包已关联</p>
                <p className="text-xs text-teal-600 mt-1">
                  你现在可以在藏品柜中同步链上 NFT，或为藏品铸造链上身份。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav currentPage="user" onNavigate={onNavigate} />
    </div>
  );
}
