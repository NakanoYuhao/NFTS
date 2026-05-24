'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collectible, NftStatus, PageType } from '@/types';
import { downloadOnftWithIdentity, downloadOnft } from '@/lib/storage/storage-local';
import { getTxExplorerUrl, getTokenExplorerUrl, getCurrentChainConfig } from '@/lib/nft-contract';
import { ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DetailPageProps {
  collectible: Collectible;
  onNavigate: (page: PageType) => void;
  onApplyNftId: (id: string, nftData: { nftStatus: NftStatus; nftId?: string; nftApplyTime?: string; nftTxHash?: string; nftBlockNumber?: number; contractAddress?: string; chainTokenId?: string; metadataUri?: string; identityUri?: string; did?: string }) => void;
  onDelete?: (id: string) => void;
}

// NFT状态显示配置（无合规审查，只有未铸造/已铸造两种状态）
const nftStatusConfig: Record<NftStatus, { label: string; color: string; bgColor: string }> = {
  none: { label: '未铸造', color: 'text-gray-400', bgColor: 'bg-gray-100' },
  minted: { label: '已认证', color: 'text-teal-600', bgColor: 'bg-teal-50' },
};

// 判断 URL 是否为视频格式
const isVideoUrl = (url: string): boolean => {
  // 处理 data URI 的情况
  if (url.startsWith('data:')) {
    return url.startsWith('data:video/');
  }
  // 处理普通 URL，提取路径部分（去掉查询参数和 hash）并检查扩展名
  try {
    const pathname = new URL(url, 'https://example.com').pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);
  } catch {
    // URL 解析失败时，回退到简单的扩展名匹配
    const lowerUrl = url.toLowerCase();
    return /\.(mp4|webm|ogg|mov|avi|mkv)(\?|#|$)/i.test(lowerUrl);
  }
};

export function DetailPage({ collectible, onNavigate, onApplyNftId, onDelete }: DetailPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const name = collectible.name || collectible.intro?.split(' - ')[0] || '未命名';
  const isVideo = collectible.sprites ? isVideoUrl(collectible.sprites) : false;

  // 兼容旧数据的nftStatus
  const nftStatus: NftStatus = collectible.nftStatus || (collectible.hasNftId ? 'minted' : 'none');
  const statusConfig = nftStatusConfig[nftStatus];

  // 是否为已认证NFT藏品（不可删除）
  const isMintedNft = nftStatus === 'minted';

  // 申请NFT — 跳转到NFT申请页面（无审查，直接铸造）
  const handleApply = () => {
    if (nftStatus !== 'none') return;
    onNavigate('apply-nft' as PageType);
  };

  // 按钮文案和状态
  const getNftButtonProps = () => {
    switch (nftStatus) {
      case 'minted':
        return { text: '✓ 已拥有 NFT', disabled: true, className: 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed' };
      default:
        return { text: '🔗 铸造 NFT', disabled: false, className: 'border-orange-400 text-orange-500 hover:bg-orange-50 hover:text-orange-600' };
    }
  };

  const nftButtonProps = getNftButtonProps();

  const handleDelete = () => {
    onDelete?.(collectible.id);
    setShowDeleteDialog(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          onClick={() => onNavigate('collection')}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          ← 返回
        </Button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">{name}</h1>
        <div className="w-20" />
      </div>

      {/* 上半部分: 藏品图片/视频 */}
      <div className="aspect-square max-h-[50vh] w-full relative overflow-hidden"
      >
        {collectible.sprites ? (
          <>
            {isVideo ? (
              <video
                src={collectible.sprites}
                className="w-full h-full object-contain"
                autoPlay={isPlaying}
                loop
                muted
                playsInline
                aria-label={name}
              />
            ) : (
              <img
                src={collectible.sprites}
                alt={name}
                className="w-full h-full object-contain"
              />
            )}
            {/* 播放按钮覆盖层 - 仅视频格式显示 */}
            {isVideo && (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  {isPlaying ? '⏸' : '▶️'}
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-orange-50">
            <span className="text-8xl">🎨</span>
          </div>
        )}
      </div>

      {/* 下半部分: 信息 */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
        
        {/* NFT状态标签 */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
          {nftStatus === 'minted' && <span>✓</span>}
          {nftStatus === 'minted' ? `已认证 ${collectible.chainTokenId ? `#${collectible.chainTokenId}` : collectible.nftId || ''}` : statusConfig.label}
        </div>

        {/* 链上认证信息 */}
        {isMintedNft && collectible.nftTxHash && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-teal-800">链上认证信息</p>
            {collectible.did && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-600">DID</span>
                <span className="text-xs text-teal-800 font-mono truncate max-w-[200px]">{collectible.did}</span>
              </div>
            )}
            {collectible.chainTokenId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-600">Token ID</span>
                <span className="text-xs text-teal-800 font-mono">#{collectible.chainTokenId}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-teal-600">交易哈希</span>
              {collectible.nftTxHash.startsWith('0x') ? (
                <a
                  href={getTxExplorerUrl(collectible.nftTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-700 font-mono hover:underline flex items-center gap-0.5"
                >
                  {collectible.nftTxHash.slice(0, 10)}...{collectible.nftTxHash.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-xs text-teal-700 font-mono">{collectible.nftTxHash}</span>
              )}
            </div>
            {collectible.nftBlockNumber && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-600">区块号</span>
                <span className="text-xs text-teal-800 font-mono">#{collectible.nftBlockNumber}</span>
              </div>
            )}
            {collectible.contractAddress && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-600">合约地址</span>
                {collectible.chainTokenId ? (
                  <a
                    href={getTokenExplorerUrl(collectible.contractAddress, collectible.chainTokenId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-700 font-mono hover:underline flex items-center gap-0.5"
                  >
                    {collectible.contractAddress.slice(0, 6)}...{collectible.contractAddress.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-teal-700 font-mono">
                    {collectible.contractAddress.slice(0, 6)}...{collectible.contractAddress.slice(-4)}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-teal-600">链</span>
              <span className="text-xs text-teal-800">{getCurrentChainConfig().name}</span>
            </div>
          </div>
        )}

        {collectible.intro?.includes(' - ') && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">一句话介绍</label>
            <p className="text-gray-700 mt-1">{collectible.intro}</p>
          </div>
        )}

        {collectible.appearance && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">外表描述</label>
            <p className="text-gray-700 mt-1">{collectible.appearance}</p>
          </div>
        )}

        {collectible.story && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">背景故事</label>
            <p className="text-gray-700 mt-1">{collectible.story}</p>
          </div>
        )}

        {collectible.character && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">性格特征</label>
            <p className="text-gray-700 mt-1">{collectible.character}</p>
          </div>
        )}

        <div className="pt-4 space-y-3">
          <Button
            onClick={() => onNavigate('chat')}
            className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white text-base font-semibold rounded-xl shadow-sm"
          >
            💬 进入对话
          </Button>
          <Button
            onClick={handleApply}
            variant="outline"
            disabled={nftButtonProps.disabled}
            className={`w-full h-12 text-base font-semibold rounded-xl ${nftButtonProps.className}`}
          >
            {nftButtonProps.text}
          </Button>
          <Button
            onClick={() => downloadOnftWithIdentity(collectible)}
            variant="outline"
            className="w-full h-10 text-sm font-medium rounded-xl border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            📦 导出 .onft + 身份文件
          </Button>
          <Button
            onClick={() => downloadOnft(collectible)}
            variant="outline"
            className="w-full h-10 text-sm font-medium rounded-xl border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            📦 仅导出 .onft
          </Button>
          {/* 删除按钮：仅本地藏品可删除，NFT已认证藏品不可删除 */}
          {!isMintedNft && (
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              className="w-full h-10 text-sm font-medium rounded-xl border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              🗑 删除藏品
            </Button>
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{name}」吗？删除后将无法恢复，建议先导出 .onft 文件备份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
