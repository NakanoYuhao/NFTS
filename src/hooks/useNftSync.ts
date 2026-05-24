// ============================================================
// useNftSync — 链上 NFT 藏品同步 Hook
//
// 提供"同步数据"和"更新数据"两个核心动作：
//   - syncFromChain: 全量同步链上 .onft 藏品到本地
//   - updateFromChain: 增量更新，对比本地与链上差异
//
// 仅处理 .onft 格式藏品，其余自动跳过
// ============================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Collectible } from '@/types';

// ----------------------------------------------------------
// 类型定义
// ----------------------------------------------------------

export type SyncStatus = 'idle' | 'checking' | 'syncing' | 'updating' | 'success' | 'error';

export interface SyncState {
  /** 当前同步状态 */
  status: SyncStatus;
  /** 同步进度（0-100） */
  progress: number;
  /** 上次同步时间 */
  lastSyncAt: string | null;
  /** 上次同步来源 */
  lastSource: string | null;
  /** 错误信息 */
  error: string | null;
  /** 上次同步结果摘要 */
  lastResult: {
    synced: number;
    skipped: number;
    errors: number;
  } | null;
  /** 索引器是否可用 */
  indexerAvailable: boolean;
  /** 待应用的差异 */
  pendingDiff: {
    toAdd: Collectible[];
    toUpdate: Collectible[];
    toRemove: string[];
  } | null;
}

const INITIAL_STATE: SyncState = {
  status: 'idle',
  progress: 0,
  lastSyncAt: null,
  lastSource: null,
  error: null,
  lastResult: null,
  indexerAvailable: false,
  pendingDiff: null,
};

// ----------------------------------------------------------
// Hook
// ----------------------------------------------------------

export function useNftSync(localCollectibles: Collectible[]) {
  const [state, setState] = useState<SyncState>(INITIAL_STATE);
  const { address, isConnected } = useAccount();

  // 检查索引器可用性
  const checkIndexerStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/nft/indexer');
      if (!response.ok) return false;
      const data = await response.json() as {
        success: boolean;
        data: { syncAvailable: boolean; availableSource: string | null };
      };
      return data.success && data.data.syncAvailable;
    } catch {
      return false;
    }
  }, []);

  // 初始化：检查索引器状态
  useEffect(() => {
    checkIndexerStatus().then((available) => {
      setState((prev) => ({ ...prev, indexerAvailable: available }));
    });
  }, [checkIndexerStatus]);

  /**
   * 同步数据：全量同步链上 .onft 藏品
   * 从链上拉取所有属于当前钱包的 .onft 藏品
   */
  const syncFromChain = useCallback(async () => {
    if (!address || !isConnected) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: '请先连接钱包',
      }));
      return [];
    }

    setState((prev) => ({ ...prev, status: 'syncing', progress: 10, error: null }));

    try {
      // 调用同步 API
      const url = `/api/nft/sync?address=${encodeURIComponent(address)}`;
      setState((prev) => ({ ...prev, progress: 30 }));

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `同步请求失败 (${response.status})`);
      }

      setState((prev) => ({ ...prev, progress: 70 }));

      const result = await response.json() as {
        success: boolean;
        data: {
          synced: Collectible[];
          skipped: Array<{ contractAddress: string; tokenId: string; reason: string }>;
          errors: Array<{ contractAddress: string; tokenId: string; error: string }>;
          source: string | null;
          syncedAt: string;
          message?: string;
        };
      };

      if (!result.success) {
        throw new Error('同步失败');
      }

      setState((prev) => ({
        ...prev,
        status: 'success',
        progress: 100,
        lastSyncAt: result.data.syncedAt,
        lastSource: result.data.source,
        lastResult: {
          synced: result.data.synced.length,
          skipped: result.data.skipped.length,
          errors: result.data.errors.length,
        },
      }));

      return result.data.synced;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '同步失败',
        progress: 0,
      }));
      return [];
    }
  }, [address, isConnected]);

  /**
   * 更新数据：增量更新，对比本地与链上差异
   * 返回差异列表，由调用方决定如何应用
   */
  const updateFromChain = useCallback(async () => {
    if (!address || !isConnected) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: '请先连接钱包',
      }));
      return null;
    }

    setState((prev) => ({ ...prev, status: 'updating', progress: 10, error: null }));

    try {
      // 只发送链上来源的藏品用于对比
      const chainLocalItems = localCollectibles.filter(
        (c) => c.syncSource === 'chain',
      );

      setState((prev) => ({ ...prev, progress: 30 }));

      const response = await fetch('/api/nft/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          localItems: chainLocalItems,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `更新请求失败 (${response.status})`);
      }

      setState((prev) => ({ ...prev, progress: 70 }));

      const result = await response.json() as {
        success: boolean;
        data: {
          toAdd: Collectible[];
          toUpdate: Collectible[];
          toRemove: string[];
          source: string | null;
          syncedAt: string;
          _meta?: {
            totalChainNfts: number;
            onftCount: number;
            skippedCount: number;
            errorCount: number;
          };
        };
      };

      if (!result.success) {
        throw new Error('更新失败');
      }

      const diff = result.data;

      setState((prev) => ({
        ...prev,
        status: 'success',
        progress: 100,
        lastSyncAt: diff.syncedAt,
        lastSource: diff.source,
        lastResult: {
          synced: diff.toAdd.length + diff.toUpdate.length,
          skipped: result.data._meta?.skippedCount ?? 0,
          errors: result.data._meta?.errorCount ?? 0,
        },
        pendingDiff: {
          toAdd: diff.toAdd,
          toUpdate: diff.toUpdate,
          toRemove: diff.toRemove,
        },
      }));

      return diff;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '更新失败',
        progress: 0,
      }));
      return null;
    }
  }, [address, isConnected, localCollectibles]);

  /**
   * 应用差异到本地
   * 在用户确认后调用
   */
  const applyDiff = useCallback(
    (
      currentItems: Collectible[],
      diff: {
        toAdd: Collectible[];
        toUpdate: Collectible[];
        toRemove: string[];
      },
    ): Collectible[] => {
      const itemMap = new Map(currentItems.map((c) => [c.id, c]));

      // 添加新藏品
      for (const item of diff.toAdd) {
        itemMap.set(item.id, item);
      }

      // 更新已有藏品
      for (const item of diff.toUpdate) {
        itemMap.set(item.id, item);
      }

      // 移除已不存在的藏品
      for (const id of diff.toRemove) {
        itemMap.delete(id);
      }

      // 清除 pendingDiff
      setState((prev) => ({ ...prev, pendingDiff: null }));

      return Array.from(itemMap.values());
    },
    [],
  );

  /**
   * 重置同步状态
   */
  const resetSync = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    syncState: state,
    syncFromChain,
    updateFromChain,
    applyDiff,
    resetSync,
    isConnected,
    walletAddress: address,
  };
}
