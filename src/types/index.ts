// NFT 铸造状态（无合规审查，直接铸造）
export type NftStatus = 'none' | 'minted';

// 链上同步来源
export type SyncSource = 'local' | 'chain' | 'pinata';

// 藏品数据类型定义
export interface Collectible {
  id: string;
  name: string; // 潮玩名称
  metadata: {
    createdAt: string;
    author: string;
  };
  sprites: string; // 藏品动画（视频URL或图片URL）
  persona: string; // 人格锚点（用于对话的AI人格描述）
  personaProtocol: string; // 人格输出控制指令 / Agentic Protocol（控制AI对话的回答策略和行为边界）
  memory: string[]; // 记忆（对话历史）
  intro: string; // 一句话介绍
  appearance?: string; // 外表描述（仅自由创作）
  story: string; // 背景故事
  character: string; // 性格特征
  // NFT 铸造相关（无审核流程，直接铸造）
  nftStatus?: NftStatus; // NFT状态
  nftId?: string; // NFT-ID身份证号
  nftApplyTime?: string; // 铸造时间
  nftTxHash?: string; // 链上交易哈希
  nftBlockNumber?: number; // 链上区块号
  /** @deprecated 使用 nftStatus 代替 */
  hasNftId?: boolean; // 兼容旧数据
  // 链上同步相关
  syncSource?: SyncSource; // 数据来源
  syncAt?: string; // 最后同步时间 (ISO string)
  chainTokenId?: string; // 链上 Token ID
  contractAddress?: string; // 合约地址
  metadataUri?: string; // ERC-721 元数据 URI (ipfs://...)
  identityUri?: string; // 身份信息 JSON URI (ipfs://...)
  onftUri?: string; // .onft 文件 URI (ipfs://...)
  imageUri?: string; // 藏品图片 IPFS URI (ipfs://...)
  ownerAddress?: string; // 持有者钱包地址
  // DID 数字身份（适配外部 DID 系统）
  did?: string; // DID 标识符 (如 did:method:identifier)
}

// 页面类型定义
export type PageType = 
  | 'home' 
  | 'creator' 
  | 'create-photo' 
  | 'create-free' 
  | 'collection' 
  | 'detail' 
  | 'chat'
  | 'enterprise'
  | 'anti-hype'
  | 'generate-ip'
  | 'apply-nft'
  | 'user'
  | 'price-monitor';

// 创作模式
export type CreateMode = 'photo' | 'free';

// 对话消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// AI生成结果
export interface AIGenerateResult {
  intro: string;
  story: string;
  character: string;
  appearance?: string;
}
