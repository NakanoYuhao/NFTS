// ============================================================
// 链下索引器 — 查询用户链上 NFT 藏品并过滤 .onft 格式
//
// 架构: 链下索引 + API 查询
//   1. 通过 Alchemy NFT API / 合约直接读取 获取用户持有的 NFT 列表
//   2. 对每个 NFT 的 tokenURI 下载 ERC-721 元数据
//   3. 从元数据中找到身份 JSON 链接（identity 字段）或 .onft 链接（animation_url）
//   4. 下载身份 JSON 获取完整元数据，下载 .onft 获取 persona/protocol/image
//   5. 仅返回通过 .onft 校验的藏品
//
// v4 适配：
//   - tokenURI → ERC-721 metadata JSON
//   - metadata.identity → 身份 JSON（包含 onftUri）
//   - 身份 JSON.onftUri / metadata.animation_url → .onft 文件（Persona + Protocol + Image）
//   - 身份 JSON 提供元数据（name, intro, story 等），.onft 提供人格和图片
//
// 环境变量依赖（按优先级）：
//   - ALCHEMY_API_KEY: Alchemy NFT API（推荐，支持多链）
//   - BLOCKCHAIN_RPC_URL + NFT_CONTRACT_ADDRESS: 合约直读模式
//   - PINATA_JWT: Pinata 查询模式（作为补充数据源）
// ============================================================

import { Collectible } from '@/types';
import { isOnftFile, unpackOnft } from './storage/onft-format';
import { toIpfsGatewayUrl } from './pinata';

// .onft 格式魔数
const ONFT_MAGIC = 0x4f4e4654; // "ONFT"

// ----------------------------------------------------------
// 类型定义
// ----------------------------------------------------------

/** 索引器查询到的原始 NFT 条目 */
export interface RawChainNft {
  contractAddress: string;
  tokenId: string;
  tokenUri?: string;
  tokenType: 'ERC721' | 'ERC1155';
  ownerAddress: string;
}

/** 同步结果 */
export interface SyncResult {
  /** 成功同步的 .onft 藏品 */
  synced: Collectible[];
  /** 跳过的非 .onft 格式 NFT */
  skipped: SkippedNft[];
  /** 同步过程中出错的 NFT */
  errors: SyncError[];
  /** 同步来源 */
  source: 'alchemy' | 'contract' | 'pinata';
  /** 同步时间 */
  syncedAt: string;
}

/** 跳过的 NFT 记录 */
export interface SkippedNft {
  contractAddress: string;
  tokenId: string;
  reason: 'not_onft_format' | 'no_token_uri' | 'no_animation_url';
}

/** 同步错误记录 */
export interface SyncError {
  contractAddress: string;
  tokenId: string;
  error: string;
}

// ----------------------------------------------------------
// Alchemy NFT API 模式
// ----------------------------------------------------------

const ALCHEMY_BASE_URLS: Record<string, string> = {
  '0x1': 'https://eth-mainnet.g.alchemy.com/nft/v3',
  '0x5': 'https://eth-goerli.g.alchemy.com/nft/v3',
  '0xaa36a7': 'https://eth-sepolia.g.alchemy.com/nft/v3',
  '0x89': 'https://polygon-mainnet.g.alchemy.com/nft/v3',
  '0x13881': 'https://polygon-mumbai.g.alchemy.com/nft/v3',
  '0x13882': 'https://polygon-amoy.g.alchemy.com/nft/v3',
};

interface AlchemyNftItem {
  contract: { address: string };
  tokenId: string;
  tokenType: string;
  tokenUri?: string;
  raw: { tokenUri?: string };
  image?: { originalUrl?: string };
  animationUrls?: Array<{ url?: string }>;
}

/**
 * 通过 Alchemy NFT API 查询用户持有的 NFT
 */
async function queryViaAlchemy(
  ownerAddress: string,
  contractAddress?: string,
): Promise<RawChainNft[]> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    throw new Error('ALCHEMY_API_KEY 未配置');
  }

  // 默认使用 Polygon Amoy 测试网
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || '0x13882';
  const baseUrl = ALCHEMY_BASE_URLS[chainId] || ALCHEMY_BASE_URLS['0xaa36a7'];

  const url = new URL(`${baseUrl}/${apiKey}/getNFTsForOwner`);
  url.searchParams.set('owner', ownerAddress);
  url.searchParams.set('withMetadata', 'true');

  // 如果指定了合约地址，只查询该合约
  if (contractAddress) {
    url.searchParams.set('contractAddresses[]', contractAddress);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alchemy API 查询失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as {
    ownedNfts: AlchemyNftItem[];
    pageKey?: string;
  };

  return (data.ownedNfts || []).map((nft) => ({
    contractAddress: nft.contract.address,
    tokenId: nft.tokenId,
    tokenUri: nft.tokenUri || nft.raw?.tokenUri,
    tokenType: (nft.tokenType === 'ERC1155' ? 'ERC1155' : 'ERC721') as RawChainNft['tokenType'],
    ownerAddress,
  }));
}

// ----------------------------------------------------------
// 合约直读模式
// ----------------------------------------------------------

/**
 * 通过直接读取合约获取用户持有的 NFT
 * 需要合约支持 ERC721Enumerable 或自定义枚举方法
 */
async function queryViaContract(
  ownerAddress: string,
): Promise<RawChainNft[]> {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  if (!rpcUrl || !contractAddress) {
    throw new Error('BLOCKCHAIN_RPC_URL 或 NFT_CONTRACT_ADDRESS 未配置');
  }

  // 动态导入 ethers，避免在非 Node 环境下报错
  const { ethers } = await import('ethers');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(
    contractAddress,
    [
      'function balanceOf(address owner) view returns (uint256)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function tokenURI(uint256 tokenId) view returns (string)',
    ],
    provider,
  );

  const balance: number = Number(await contract.balanceOf(ownerAddress));
  const results: RawChainNft[] = [];

  for (let i = 0; i < balance; i++) {
    try {
      const tokenId: bigint = await contract.tokenOfOwnerByIndex(ownerAddress, i);
      const tokenUri: string = await contract.tokenURI(tokenId);
      results.push({
        contractAddress,
        tokenId: tokenId.toString(),
        tokenUri,
        tokenType: 'ERC721',
        ownerAddress,
      });
    } catch {
      // 跳过无法读取的 token
      continue;
    }
  }

  return results;
}

// ----------------------------------------------------------
// Pinata 查询模式（补充数据源）
// ----------------------------------------------------------

/**
 * 通过 Pinata 查询平台上传的 .onft 文件
 * 用于配合合约数据，获取 .onft 文件的下载链接
 */
async function queryViaPinata(
  ownerAddress: string,
): Promise<RawChainNft[]> {
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!jwt && !(apiKey && secretKey)) {
    throw new Error('Pinata 未配置');
  }

  const headers: Record<string, string> = {};
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  } else {
    headers.pinata_api_key = apiKey!;
    headers.pinata_secret_api_key = secretKey!;
  }

  // 查询 Pinata 上 .onft 关联的文件
  const response = await fetch('https://api.pinata.cloud/data/pinList?status=pinned', {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Pinata 查询失败: ${response.status}`);
  }

  const data = await response.json() as {
    rows: Array<{
      ipfs_pin_hash: string;
      metadata: { name?: string; keyvalues?: Record<string, string> };
      date_pinned: string;
    }>;
  };

  // 过滤出与该用户地址关联的 .onft 文件
  const onftFiles = (data.rows || []).filter((row) => {
    const name = row.metadata?.name || '';
    const keyvalues = row.metadata?.keyvalues || {};
    // 通过文件名或 keyvalues 中的 ownerAddress 匹配
    return (
      name.endsWith('.onft') ||
      name.includes('-onft') ||
      keyvalues.ownerAddress?.toLowerCase() === ownerAddress.toLowerCase() ||
      keyvalues.type === 'onft'
    );
  });

  return onftFiles.map((file) => ({
    contractAddress: process.env.NFT_CONTRACT_ADDRESS || '',
    tokenId: file.metadata?.keyvalues?.tokenId || file.ipfs_pin_hash,
    tokenUri: toIpfsGatewayUrl(file.ipfs_pin_hash),
    tokenType: 'ERC721' as const,
    ownerAddress,
  }));
}

// ----------------------------------------------------------
// .onft 格式校验与下载（v4 适配）
// ----------------------------------------------------------

/** .onft 解包结果（v4: 元数据来自身份 JSON，非 .onft 内嵌） */
interface OnftResolvedData {
  /** 身份信息（v1-v3 从 .onft 内嵌 JSON，v4 从独立身份 JSON） */
  json: Record<string, unknown>;
  /** 图片二进制数据 */
  imageBuffer: ArrayBuffer | null;
}

/**
 * 从 URI 下载内容并校验是否为 .onft 格式
 * 支持两种路径：
 *   1. tokenURI → ERC-721 metadata JSON → animation_url → .onft
 *   2. tokenURI → 直接指向 .onft 二进制文件
 *
 * v4 适配：
 *   - 从 ERC-721 metadata 的 identity 字段下载身份 JSON
 *   - 从 animation_url 下载 .onft（Persona + Protocol + Image）
 *   - 合并身份 JSON + .onft 数据返回
 */
async function downloadAndValidateOnft(
  uri: string,
): Promise<OnftResolvedData | null> {
  try {
    // 将 ipfs:// URI 转换为网关 URL
    let downloadUrl = uri;
    if (uri.startsWith('ipfs://')) {
      const cid = uri.replace('ipfs://', '');
      downloadUrl = toIpfsGatewayUrl(cid);
    }

    const response = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(15000), // 15s 超时
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';

    // 如果返回的是 JSON 元数据（ERC-721 标准），解析后找到 .onft 和身份 JSON
    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      const text = await response.text();
      try {
        const metadata = JSON.parse(text) as {
          animation_url?: string;
          image?: string;
          identity?: string;  // 身份 JSON URI
          name?: string;
          description?: string;
          attributes?: Array<{ trait_type: string; value: string | number }>;
        };

        // v4 路径：先从 identity 字段获取身份 JSON
        let identityJson: Record<string, unknown> | null = null;
        if (metadata.identity) {
          identityJson = await fetchIdentityJson(metadata.identity);
        }

        // 检查 animation_url 是否指向 .onft 文件
        const animUrl = metadata.animation_url;
        if (animUrl && (animUrl.endsWith('.onft') || animUrl.includes('onft'))) {
          const onftData = await downloadOnftFile(animUrl);
          if (onftData) {
            // v4: 身份 JSON + .onft 数据合并
            if (identityJson) {
              return {
                json: identityJson,
                imageBuffer: onftData.imageBuffer,
              };
            }
            // v3 fallback: .onft 内嵌 JSON
            return {
              json: onftData.json,
              imageBuffer: onftData.imageBuffer,
            };
          }
        }

        // 尝试直接从 animation_url 下载并校验
        if (animUrl) {
          const onftData = await downloadOnftFile(animUrl);
          if (onftData) {
            if (identityJson) {
              return { json: identityJson, imageBuffer: onftData.imageBuffer };
            }
            return { json: onftData.json, imageBuffer: onftData.imageBuffer };
          }
        }

        // 不是 .onft 格式
        return null;
      } catch {
        // 不是 JSON，可能是原始 .onft 二进制文件
        // 重新以 ArrayBuffer 方式下载
        const binResponse = await fetch(downloadUrl, {
          signal: AbortSignal.timeout(15000),
        });
        if (!binResponse.ok) return null;
        const buffer = await binResponse.arrayBuffer();
        return validateOnftBuffer(buffer);
      }
    }

    // 二进制内容 — 直接校验 .onft 魔数
    const buffer = await response.arrayBuffer();
    return validateOnftBuffer(buffer);
  } catch {
    return null;
  }
}

/**
 * 从 URI 下载身份 JSON 文件
 */
async function fetchIdentityJson(uri: string): Promise<Record<string, unknown> | null> {
  try {
    let downloadUrl = uri;
    if (uri.startsWith('ipfs://')) {
      const cid = uri.replace('ipfs://', '');
      downloadUrl = toIpfsGatewayUrl(cid);
    }

    const response = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const text = await response.text();
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * 下载 .onft 文件并解包
 */
async function downloadOnftFile(
  uri: string,
): Promise<{ json: Record<string, unknown>; imageBuffer: ArrayBuffer | null } | null> {
  try {
    let downloadUrl = uri;
    if (uri.startsWith('ipfs://')) {
      const cid = uri.replace('ipfs://', '');
      downloadUrl = toIpfsGatewayUrl(cid);
    }

    const response = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    return validateOnftBuffer(buffer);
  } catch {
    return null;
  }
}

/**
 * 校验 ArrayBuffer 是否为有效 .onft 文件并解包
 */
function validateOnftBuffer(
  buffer: ArrayBuffer,
): { json: Record<string, unknown>; imageBuffer: ArrayBuffer | null } | null {
  try {
    if (!isOnftFile(buffer)) return null;
    const { json, imageBuffer } = unpackOnft(buffer);
    return { json, imageBuffer };
  } catch {
    return null;
  }
}

/**
 * 校验 URI 是否可能指向 .onft 内容（快速预判，不做完整下载）
 */
function isLikelyOnftUri(uri: string): boolean {
  if (!uri) return false;
  return uri.endsWith('.onft') || uri.includes('onft') || uri.startsWith('ipfs://');
}

// ----------------------------------------------------------
// 核心同步函数
// ----------------------------------------------------------

/**
 * 查询用户链上 NFT（自动选择数据源）
 */
export async function queryUserNfts(
  ownerAddress: string,
  contractAddress?: string,
): Promise<RawChainNft[]> {
  // 优先级: Alchemy > 合约直读 > Pinata
  if (process.env.ALCHEMY_API_KEY) {
    return queryViaAlchemy(ownerAddress, contractAddress);
  }

  if (process.env.BLOCKCHAIN_RPC_URL && process.env.NFT_CONTRACT_ADDRESS) {
    return queryViaContract(ownerAddress);
  }

  if (process.env.PINATA_JWT || (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY)) {
    return queryViaPinata(ownerAddress);
  }

  throw new Error('未配置任何链上数据源。请设置 ALCHEMY_API_KEY、BLOCKCHAIN_RPC_URL 或 PINATA_JWT');
}

/**
 * 判断当前可用的数据源
 */
export function getAvailableSource(): 'alchemy' | 'contract' | 'pinata' | null {
  if (process.env.ALCHEMY_API_KEY) return 'alchemy';
  if (process.env.BLOCKCHAIN_RPC_URL && process.env.NFT_CONTRACT_ADDRESS) return 'contract';
  if (process.env.PINATA_JWT || (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY)) return 'pinata';
  return null;
}

/**
 * 同步用户链上 .onft 藏品
 * 核心入口：查询 → 下载 → 校验 → 转换
 */
export async function syncOnftCollectibles(
  ownerAddress: string,
  contractAddress?: string,
): Promise<SyncResult> {
  const synced: Collectible[] = [];
  const skipped: SkippedNft[] = [];
  const errors: SyncError[] = [];
  const source = getAvailableSource() || 'pinata';

  // Step 1: 查询用户持有的 NFT
  let rawNfts: RawChainNft[];
  try {
    rawNfts = await queryUserNfts(ownerAddress, contractAddress);
  } catch (err) {
    throw new Error(`查询链上 NFT 失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }

  // Step 2: 逐个下载并校验 .onft 格式
  for (const nft of rawNfts) {
    // 没有 tokenUri 的直接跳过
    if (!nft.tokenUri) {
      skipped.push({
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        reason: 'no_token_uri',
      });
      continue;
    }

    try {
      const onftData = await downloadAndValidateOnft(nft.tokenUri);

      if (!onftData) {
        // 不是 .onft 格式，跳过
        skipped.push({
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          reason: 'not_onft_format',
        });
        continue;
      }

      // Step 3: 将 .onft 数据转换为 Collectible 对象
      const collectible = onftJsonToCollectible(
        onftData.json,
        onftData.imageBuffer,
        nft,
      );

      synced.push(collectible);
    } catch (err) {
      errors.push({
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        error: err instanceof Error ? err.message : '未知错误',
      });
    }
  }

  return {
    synced,
    skipped,
    errors,
    source,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * 增量更新：对比本地数据与链上数据，返回差异
 */
export function computeSyncDiff(
  localItems: Collectible[],
  chainItems: Collectible[],
): {
  /** 链上有但本地没有的新藏品 */
  toAdd: Collectible[];
  /** 链上已更新（syncAt 更新）的藏品 */
  toUpdate: Collectible[];
  /** 链上已不存在（可能已转移）的藏品 ID */
  toRemove: string[];
} {
  const chainMap = new Map(chainItems.map((c) => [c.id, c]));
  const localMap = new Map(localItems.map((c) => [c.id, c]));

  const toAdd: Collectible[] = [];
  const toUpdate: Collectible[] = [];

  // 链上数据遍历
  for (const chainItem of chainItems) {
    const localItem = localMap.get(chainItem.id);
    if (!localItem) {
      toAdd.push(chainItem);
    } else if (
      chainItem.syncAt &&
      localItem.syncAt &&
      chainItem.syncAt > localItem.syncAt
    ) {
      toUpdate.push(chainItem);
    }
  }

  // 本地链上来源的藏品，但链上已不存在
  const toRemove: string[] = [];
  for (const localItem of localItems) {
    if (localItem.syncSource === 'chain' && !chainMap.has(localItem.id)) {
      toRemove.push(localItem.id);
    }
  }

  return { toAdd, toUpdate, toRemove };
}

// ----------------------------------------------------------
// 工具函数
// ----------------------------------------------------------

/**
 * 将身份 JSON + .onft 图片数据转换为 Collectible 对象
 * 兼容 v1-v4：v1-v3 从 .onft 内嵌 JSON 提取元数据，v4 从独立身份 JSON 提取
 */
function onftJsonToCollectible(
  json: Record<string, unknown>,
  imageBuffer: ArrayBuffer | null,
  chainNft: RawChainNft,
): Collectible {
  const metadata = json.metadata as { createdAt?: string; author?: string } | undefined;

  // 处理图片：如果有图片 buffer，转为 data URL
  let sprites = (json.sprites as string) || '';
  if (!sprites && imageBuffer) {
    try {
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      // 注意：这里在 Node.js 环境中无法创建 data URL
      // 前端需要在收到数据后自行处理图片
      sprites = `onft:image:${chainNft.tokenId}`;
    } catch {
      sprites = '';
    }
  }

  return {
    id: (json.id as string) || `chain-${chainNft.contractAddress}-${chainNft.tokenId}`,
    name: (json.name as string) || `NFT #${chainNft.tokenId}`,
    metadata: {
      createdAt: metadata?.createdAt || (json.createdAt as string) || new Date().toISOString(),
      author: metadata?.author || (json.creator as string) || chainNft.ownerAddress || '',
    },
    sprites,
    persona: (json.persona as string) || '',
    personaProtocol: (json.personaProtocol as string) || '',
    memory: (json.memory as string[]) || [],
    intro: (json.intro as string) || (json.description as string) || '',
    appearance: json.appearance as string | undefined,
    story: (json.story as string) || '',
    character: (json.character as string) || '',
    // NFT 状态
    nftStatus: 'minted',
    nftId: `NFT-${chainNft.tokenId}`,
    nftTxHash: chainNft.tokenId,
    // 链上同步信息
    syncSource: 'chain',
    syncAt: new Date().toISOString(),
    chainTokenId: chainNft.tokenId,
    contractAddress: chainNft.contractAddress,
    metadataUri: chainNft.tokenUri,
    identityUri: (json.identityUri as string) || undefined,
    onftUri: (json.onftUri as string) || chainNft.tokenUri,
    imageUri: (json.imageUri as string) || undefined,
    ownerAddress: chainNft.ownerAddress,
    did: (json.did as string) || undefined,
  };
}

/**
 * 快速校验：给定 URI 是否可能是 .onft 文件
 * 用于前端预判，减少无效请求
 */
export function isOnftUri(uri: string): boolean {
  return isLikelyOnftUri(uri);
}

/**
 * 快速校验：给定 ArrayBuffer 头部是否匹配 .onft 魔数
 */
export function checkOnftMagic(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new DataView(buffer);
  return view.getUint32(0, false) === ONFT_MAGIC;
}
