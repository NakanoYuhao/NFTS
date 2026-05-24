'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { HomePage } from '@/components/HomePage';
import { CreatorPage } from '@/components/CreatorPage';
import { CollectionPage } from '@/components/CollectionPage';
import { DetailPage } from '@/components/DetailPage';
import { ChatPage } from '@/components/ChatPage';
import { EnterprisePage } from '@/components/EnterprisePage';
import { CreatePage } from '@/components/CreatePage';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { UserPage } from '@/components/UserPage';
import NftApplyPage from '@/components/NftApplyPage';
import { PriceMonitorPage } from '@/components/PriceMonitorPage';
import { ChatMessage, Collectible, NftStatus, PageType } from '@/types';

export default function App() {
  const {
    currentPage,
    collectibles,
    selectedCollectible,
    isLoading,
    setIsLoading,
    navigateTo,
    addCollectible,
    updateCollectible,
    deleteCollectible,
    setSelectedCollectible,
    saveCollectibles,
  } = useAppStore();

  // 查看藏品详情
  const handleViewCollectible = (id: string) => {
    const item = collectibles.find(c => c.id === id);
    if (item) {
      setSelectedCollectible(item);
      navigateTo('detail');
    }
  };

  // 铸造NFT
  const handleApplyNftId = (id: string, nftData: { nftStatus: NftStatus; nftId?: string; nftApplyTime?: string; nftTxHash?: string; nftBlockNumber?: number; contractAddress?: string; chainTokenId?: string; metadataUri?: string; identityUri?: string; did?: string }) => {
    updateCollectible(id, {
      nftStatus: nftData.nftStatus,
      nftId: nftData.nftId,
      nftApplyTime: nftData.nftApplyTime,
      nftTxHash: nftData.nftTxHash,
      nftBlockNumber: nftData.nftBlockNumber,
      contractAddress: nftData.contractAddress,
      chainTokenId: nftData.chainTokenId,
      metadataUri: nftData.metadataUri,
      identityUri: nftData.identityUri,
      did: nftData.did,
    });
  };

  // 更新对话记忆
  const handleUpdateMemory = (id: string, chatMessages: ChatMessage[]) => {
    const memoryStrings = chatMessages.map(m => m.content);
    updateCollectible(id, { memory: memoryStrings });
  };

  // 同步更新：用完整列表替换本地藏品
  const handleSyncUpdate = (items: Collectible[]) => {
    saveCollectibles(items);
  };

  // 删除藏品
  const handleDeleteCollectible = (id: string) => {
    deleteCollectible(id);
    // 如果当前在详情页，删除后返回藏品柜
    if (currentPage === 'detail') {
      navigateTo('collection');
    }
  };

  // 导航（处理类型转换）
  const handleNavigate = (page: PageType | string) => {
    navigateTo(page as PageType);
  };

  // 根据当前页面渲染对应组件
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;

      case 'creator':
        return (
          <CreatorPage
            onNavigate={navigateTo}
            onSelectMode={(mode) => navigateTo(mode === 'photo' ? 'create-photo' : 'create-free')}
          />
        );

      case 'create-photo':
        return (
          <CreatePage
            mode="photo"
            onNavigate={navigateTo}
            onCreate={addCollectible}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );

      case 'create-free':
        return (
          <CreatePage
            mode="free"
            onNavigate={navigateTo}
            onCreate={addCollectible}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );

      case 'collection':
        return (
          <CollectionPage
            collections={collectibles}
            onSelect={handleViewCollectible}
            onNavigate={navigateTo}
            onImport={addCollectible}
            onDelete={handleDeleteCollectible}
            onSyncUpdate={handleSyncUpdate}
          />
        );

      case 'detail':
        if (!selectedCollectible) {
          navigateTo('collection');
          return null;
        }
        return (
          <DetailPage
            collectible={selectedCollectible}
            onNavigate={navigateTo}
            onApplyNftId={handleApplyNftId}
            onDelete={handleDeleteCollectible}
          />
        );

      case 'chat':
        if (!selectedCollectible) {
          navigateTo('collection');
          return null;
        }
        return (
          <ChatPage
            collectible={selectedCollectible}
            onNavigate={navigateTo}
            onUpdateMemory={handleUpdateMemory}
          />
        );

      case 'enterprise':
        return <EnterprisePage onNavigate={navigateTo} />;

      case 'user':
        return <UserPage onNavigate={navigateTo} />;

      case 'price-monitor':
        return <PriceMonitorPage onNavigate={navigateTo} />;

      case 'anti-hype':
        return (
          <PlaceholderPage
            title="防炒作服务"
            onNavigate={navigateTo}
            backPage="enterprise"
          />
        );

      case 'generate-ip':
        return (
          <PlaceholderPage
            title="生成IP服务"
            onNavigate={navigateTo}
            backPage="enterprise"
          />
        );

      case 'apply-nft':
        if (!selectedCollectible) {
          navigateTo('collection');
          return null;
        }
        return (
          <NftApplyPage
            collectible={selectedCollectible}
            onNavigate={navigateTo}
            onApplyNftId={handleApplyNftId}
          />
        );

      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {renderPage()}
    </div>
  );
}
