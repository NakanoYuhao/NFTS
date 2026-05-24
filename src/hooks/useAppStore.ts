'use client';

import { useState, useCallback, useEffect } from 'react';
import { Collectible, PageType, ChatMessage } from '@/types';

const STORAGE_KEY = 'open-nfts-collectibles';

export function useAppStore() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [selectedCollectible, setSelectedCollectible] = useState<Collectible | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 从localStorage加载藏品（自动去重）
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: Collectible[] = JSON.parse(stored);
        // 按 id 去重，保留最后出现的（即最新的）
        const seen = new Map<string, Collectible>();
        for (const item of parsed) {
          seen.set(item.id, item);
        }
        const deduped = Array.from(seen.values());
        // 如果有重复项，回写清理后的数据
        if (deduped.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
        }
        setCollectibles(deduped);
      } catch (e) {
        console.error('Failed to parse stored collectibles:', e);
      }
    }
  }, []);

  // 保存藏品到localStorage（带quota保护）
  const saveCollectibles = useCallback((items: Collectible[]) => {
    setCollectibles(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // localStorage溢出时，尝试清理sprites中的data URL再重试
      console.warn('localStorage空间不足，尝试清理大数据...');
      const cleaned = items.map(item => ({
        ...item,
        sprites: item.sprites?.startsWith('data:') ? '' : item.sprites,
      }));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        setCollectibles(cleaned);
      } catch (e2) {
        console.error('清理后仍然无法保存，清空藏品数据:', e2);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // 添加新藏品（若 id 已存在则替换，避免重复）
  const addCollectible = useCallback((collectible: Collectible) => {
    const newItems = [
      ...collectibles.filter(item => item.id !== collectible.id),
      collectible,
    ];
    saveCollectibles(newItems);
  }, [collectibles, saveCollectibles]);

  // 更新藏品
  const updateCollectible = useCallback((id: string, updates: Partial<Collectible>) => {
    const newItems = collectibles.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    saveCollectibles(newItems);
    if (selectedCollectible?.id === id) {
      setSelectedCollectible({ ...selectedCollectible, ...updates });
    }
  }, [collectibles, selectedCollectible, saveCollectibles]);

  // 删除藏品
  const deleteCollectible = useCallback((id: string) => {
    const newItems = collectibles.filter(item => item.id !== id);
    saveCollectibles(newItems);
    if (selectedCollectible?.id === id) {
      setSelectedCollectible(null);
    }
  }, [collectibles, selectedCollectible, saveCollectibles]);

  // 导航到指定页面
  const navigateTo = useCallback((page: PageType) => {
    setCurrentPage(page);
  }, []);

  // 查看藏品详情
  const viewCollectible = useCallback((collectible: Collectible) => {
    setSelectedCollectible(collectible);
    setMessages(collectible.memory.map((msg, idx) => ({
      id: `${collectible.id}-${idx}`,
      role: idx % 2 === 0 ? 'user' : 'assistant' as const,
      content: msg,
      timestamp: new Date().toISOString(),
    })));
    setCurrentPage('detail');
  }, []);

  // 添加对话消息
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    if (selectedCollectible) {
      const updatedMemory = [...selectedCollectible.memory, message.content];
      updateCollectible(selectedCollectible.id, { memory: updatedMemory });
    }
  }, [selectedCollectible, updateCollectible]);

  return {
    currentPage,
    collectibles,
    selectedCollectible,
    messages,
    isLoading,
    setIsLoading,
    navigateTo,
    addCollectible,
    updateCollectible,
    deleteCollectible,
    viewCollectible,
    addMessage,
    setSelectedCollectible,
    saveCollectibles,
  };
}
