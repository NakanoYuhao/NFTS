'use client';

import { useRef, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { Collectible, PageType } from '@/types';
import { importOnft, detectOnftVersion } from '@/lib/storage/storage-local';
import { useNftSync, SyncStatus } from '@/hooks/useNftSync';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CollectionPageProps {
  collections: Collectible[];
  onSelect: (id: string) => void;
  onNavigate: (page: PageType) => void;
  onImport?: (collectible: Collectible) => void;
  onDelete?: (id: string) => void;
  onSyncUpdate?: (items: Collectible[]) => void;
}

export function CollectionPage({
  collections,
  onSelect,
  onNavigate,
  onImport,
  onDelete,
  onSyncUpdate,
}: CollectionPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const [pendingOnftFile, setPendingOnftFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collectible | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);

  const { isConnected } = useAccount();
  const {
    syncState,
    syncFromChain,
    updateFromChain,
    applyDiff,
    resetSync,
  } = useNftSync(collections);

  // 同步数据：全量拉取
  const handleSyncFromChain = useCallback(async () => {
    const synced = await syncFromChain();
    if (synced.length > 0 && onSyncUpdate) {
      // 合并：本地已有的保留，新增链上藏品
      const existingIds = new Set(collections.map((c) => c.id));
      const newItems = synced.filter((c) => !existingIds.has(c.id));
      if (newItems.length > 0) {
        onSyncUpdate([...collections, ...newItems]);
      }
    }
    setSyncDialogOpen(false);
  }, [syncFromChain, onSyncUpdate, collections]);

  // 更新数据：增量更新
  const handleUpdateFromChain = useCallback(async () => {
    const diff = await updateFromChain();
    if (diff && (diff.toAdd.length > 0 || diff.toUpdate.length > 0 || diff.toRemove.length > 0)) {
      setDiffDialogOpen(true);
    } else if (diff) {
      // 无差异
      setSyncDialogOpen(false);
    }
  }, [updateFromChain]);

  // 应用差异
  const handleApplyDiff = useCallback(() => {
    if (!syncState.pendingDiff || !onSyncUpdate) return;
    const updated = applyDiff(collections, syncState.pendingDiff);
    onSyncUpdate(updated);
    setDiffDialogOpen(false);
    setSyncDialogOpen(false);
  }, [syncState.pendingDiff, applyDiff, onSyncUpdate, collections]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件扩展名
    if (!file.name.endsWith('.onft')) {
      alert('请选择 .onft 格式的文件');
      return;
    }

    try {
      // 检测 .onft 版本
      const version = await detectOnftVersion(file);

      if (version >= 4) {
        // v4: 身份 JSON 已分离，提示用户可选提供身份 JSON 文件
        setPendingOnftFile(file);
      } else {
        // v1-v3: 身份 JSON 嵌入 .onft，直接导入
        const collectible = await importOnft(file);
        onImport?.(collectible);
      }
    } catch (err) {
      alert(`导入失败：${err instanceof Error ? err.message : '未知错误'}`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理身份 JSON 文件选择（v4 配套文件）
  const handleIdentityFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const identityFile = e.target.files?.[0];
    if (!identityFile || !pendingOnftFile) return;

    if (!identityFile.name.endsWith('.json')) {
      alert('请选择 .json 格式的身份信息文件');
      return;
    }

    try {
      const collectible = await importOnft(pendingOnftFile, identityFile);
      onImport?.(collectible);
    } catch (err) {
      alert(`导入失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setPendingOnftFile(null);
      if (identityInputRef.current) {
        identityInputRef.current.value = '';
      }
    }
  };

  // 跳过身份 JSON，直接导入 v4 .onft（使用基础信息）
  const handleSkipIdentity = async () => {
    if (!pendingOnftFile) return;

    try {
      const collectible = await importOnft(pendingOnftFile);
      onImport?.(collectible);
    } catch (err) {
      alert(`导入失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setPendingOnftFile(null);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      onDelete?.(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const isMintedNft = (item: Collectible): boolean => {
    const nftStatus = item.nftStatus || (item.hasNftId ? 'minted' : 'none');
    return nftStatus === 'minted';
  };

  // 链上来源标记
  const isChainSynced = (item: Collectible): boolean => {
    return item.syncSource === 'chain';
  };

  // 同步状态文字
  const getSyncStatusText = (status: SyncStatus): string => {
    switch (status) {
      case 'checking': return '检测中...';
      case 'syncing': return '同步中...';
      case 'updating': return '更新中...';
      case 'success': return '同步完成';
      case 'error': return '同步失败';
      default: return '';
    }
  };

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
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">藏品柜</h1>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="ghost"
            className="text-teal-500 hover:text-teal-600 hover:bg-teal-50 text-sm"
          >
            📥 导入
          </Button>
          <Button
            onClick={() => setSyncDialogOpen(true)}
            variant="ghost"
            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 text-sm"
          >
            🔗 同步
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".onft"
          onChange={handleImport}
          className="hidden"
        />
        <input
          ref={identityInputRef}
          type="file"
          accept=".json"
          onChange={handleIdentityFileChange}
          className="hidden"
        />
      </div>

      {/* 同步状态条 */}
      {(syncState.status === 'syncing' || syncState.status === 'updating') && (
        <div className="px-4 py-2 bg-teal-50 border-b border-teal-100">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-teal-700">
              {getSyncStatusText(syncState.status)}
            </span>
            {syncState.progress > 0 && (
              <div className="flex-1 h-1.5 bg-teal-100 rounded-full overflow-hidden ml-2">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${syncState.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {syncState.status === 'success' && syncState.lastResult && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">
              同步完成：{syncState.lastResult.synced} 个 .onft 藏品
              {syncState.lastResult.skipped > 0 && `，${syncState.lastResult.skipped} 个非 .onft 已跳过`}
            </span>
            <button
              onClick={() => resetSync()}
              className="text-xs text-green-500 hover:text-green-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {syncState.status === 'error' && syncState.error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700">{syncState.error}</span>
            <button
              onClick={() => resetSync()}
              className="text-xs text-red-500 hover:text-red-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 藏品网格 */}
      <div className="flex-1 overflow-auto p-4">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-4">
            <span className="text-6xl">💎</span>
            <p className="text-lg">还没有藏品</p>
            <p className="text-sm">去创作你的第一个NFT潮玩吧！</p>
            {syncState.indexerAvailable && (
              <Button
                onClick={() => setSyncDialogOpen(true)}
                variant="outline"
                className="mt-2 border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                🔗 从链上同步 .onft 藏品
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {collections.map((item) => (
              <div
                key={item.id}
                className="group relative"
              >
                <button
                  onClick={() => onSelect(item.id)}
                  className="w-full aspect-square rounded-2xl overflow-hidden bg-white transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="w-full h-full relative"
                  >
                    {item.sprites && !item.sprites.startsWith('onft:image:') ? (
                      <img
                        src={item.sprites}
                        alt={item.name || item.intro}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-orange-50">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}
                    {/* 名称层 */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 rounded-b-2xl">
                      <div className="flex items-center gap-1">
                        {isChainSynced(item) && (
                          <span className="text-[10px] leading-none px-1 py-0.5 rounded bg-teal-500 text-white">链上</span>
                        )}
                        {isMintedNft(item) && !isChainSynced(item) && (
                          <span className="text-[10px] leading-none px-1 py-0.5 rounded bg-orange-500 text-white">NFT</span>
                        )}
                        <p className="text-gray-700 text-xs truncate font-medium">
                          {item.name || item.intro?.split(' - ')[0] || '未命名'}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
                {/* 删除按钮：仅本地藏品显示，NFT已认证藏品不显示 */}
                {!isMintedNft(item) && !isChainSynced(item) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(item);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    aria-label="删除藏品"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav currentPage="collection" onNavigate={onNavigate} />

      {/* 同步对话框 */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>链上同步</DialogTitle>
            <DialogDescription>
              同步你在链上铸造的 .onft 格式藏品到本地。非 .onft 格式的藏品将自动跳过。
            </DialogDescription>
          </DialogHeader>

          {!isConnected ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-gray-500">请先连接钱包以查询链上藏品</p>
              <ConnectButton />
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              {/* 同步数据 */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center text-white text-lg">
                    ↓
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">同步数据</h4>
                    <p className="text-xs text-gray-500">
                      全量拉取链上所有 .onft 藏品
                    </p>
                  </div>
                  <Button
                    onClick={handleSyncFromChain}
                    disabled={syncState.status === 'syncing' || syncState.status === 'updating'}
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                    size="sm"
                  >
                    {syncState.status === 'syncing' ? '同步中...' : '同步'}
                  </Button>
                </div>
              </div>

              {/* 更新数据 */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white text-lg">
                    ↻
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">更新数据</h4>
                    <p className="text-xs text-gray-500">
                      增量更新，对比本地与链上差异
                    </p>
                  </div>
                  <Button
                    onClick={handleUpdateFromChain}
                    disabled={syncState.status === 'syncing' || syncState.status === 'updating'}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                  >
                    {syncState.status === 'updating' ? '更新中...' : '更新'}
                  </Button>
                </div>
              </div>

              {/* 上次同步信息 */}
              {syncState.lastSyncAt && (
                <div className="text-xs text-gray-400 text-center">
                  上次同步：{new Date(syncState.lastSyncAt).toLocaleString()}
                  {syncState.lastSource && ` (${syncState.lastSource})`}
                </div>
              )}

              {/* 索引器不可用提示 */}
              {!syncState.indexerAvailable && (
                <div className="text-xs text-amber-600 text-center bg-amber-50 rounded-lg p-3">
                  链上数据源未配置，请联系管理员设置 ALCHEMY_API_KEY 或 BLOCKCHAIN_RPC_URL
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 差异确认对话框 */}
      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>发现更新</DialogTitle>
            <DialogDescription>
              链上数据与本地存在差异，请确认是否应用更新。
            </DialogDescription>
          </DialogHeader>

          {syncState.pendingDiff && (
            <div className="flex flex-col gap-3 py-2">
              {syncState.pendingDiff.toAdd.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">+</span>
                  <span className="text-gray-700">
                    新增 <strong>{syncState.pendingDiff.toAdd.length}</strong> 个链上 .onft 藏品
                  </span>
                </div>
              )}
              {syncState.pendingDiff.toUpdate.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">↑</span>
                  <span className="text-gray-700">
                    更新 <strong>{syncState.pendingDiff.toUpdate.length}</strong> 个藏品数据
                  </span>
                </div>
              )}
              {syncState.pendingDiff.toRemove.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">-</span>
                  <span className="text-gray-700">
                    移除 <strong>{syncState.pendingDiff.toRemove.length}</strong> 个已转移藏品
                  </span>
                </div>
              )}
              {syncState.pendingDiff.toAdd.length === 0 &&
                syncState.pendingDiff.toUpdate.length === 0 &&
                syncState.pendingDiff.toRemove.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">无差异</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDiffDialogOpen(false)}
            >
              暂不更新
            </Button>
            <Button
              onClick={handleApplyDiff}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              应用更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteTarget?.name || deleteTarget?.intro?.split(' - ')[0] || '未命名'}」吗？删除后将无法恢复，建议先导出 .onft 文件备份。
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

      {/* v4 身份 JSON 选择对话框 */}
      <AlertDialog open={pendingOnftFile !== null} onOpenChange={(open) => { if (!open) setPendingOnftFile(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>导入 v4 .onft 文件</AlertDialogTitle>
            <AlertDialogDescription>
              v4 格式的 .onft 文件中不包含身份信息。你可以选择配套的身份 JSON 文件以获取完整元数据，或跳过使用基础信息导入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={() => setPendingOnftFile(null)}>
              取消
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleSkipIdentity}
            >
              跳过，使用基础信息
            </Button>
            <AlertDialogAction
              onClick={() => identityInputRef.current?.click()}
              className="bg-teal-500 hover:bg-teal-600"
            >
              选择身份 JSON 文件
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
