// ============================================================
// 本地存储适配器 — 基于 localStorage + .onft v4 导入/导出
//
// v4 变更：身份 JSON 从 .onft 中分离
//   - 导出：生成 .onft 文件 + 独立的身份 JSON 文件
//   - 导入：支持 v1-v4 的 .onft 文件，v4 可选搭配身份 JSON
// ============================================================

import { Collectible } from '@/types';
import {
  packOnft,
  unpackOnft,
  generateIdentityJson,
  serializeIdentityJson,
  parseIdentityJson,
  readFileAsArrayBuffer,
  readFileAsText,
  readOnftVersion,
} from './onft-format';

const STORAGE_KEY = 'open-nfts-collectibles';

/**
 * 从 localStorage 加载所有藏品
 */
export function loadAll(): Collectible[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error('加载藏品数据失败:', e);
    return [];
  }
}

/**
 * 保存所有藏品到 localStorage（带 quota 保护）
 */
export function saveAll(items: Collectible[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 第一道防线：清理 sprites 中的 data URL
    console.warn('localStorage空间不足，尝试清理大数据...');
    const cleaned = items.map(item => ({
      ...item,
      sprites: item.sprites?.startsWith('data:') ? '' : item.sprites,
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch (e2) {
      console.error('清理后仍然无法保存，清空藏品数据:', e2);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

/**
 * 添加单个藏品（若 id 已存在则替换，避免重复）
 */
export function add(collectible: Collectible): void {
  const items = loadAll().filter(item => item.id !== collectible.id);
  items.push(collectible);
  saveAll(items);
}

/**
 * 更新单个藏品
 */
export function update(id: string, updates: Partial<Collectible>): Collectible | null {
  const items = loadAll();
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates };
  saveAll(items);
  return items[index];
}

/**
 * 删除单个藏品
 */
export function remove(id: string): void {
  const items = loadAll().filter(item => item.id !== id);
  saveAll(items);
}

/**
 * 根据 ID 加载单个藏品
 */
export function loadById(id: string): Collectible | null {
  const items = loadAll();
  return items.find(item => item.id === id) ?? null;
}

// ============================================================
// 导出 — v4: .onft + 独立身份 JSON
// ============================================================

/**
 * 导出藏品为 .onft v4 文件 Blob（不含身份 JSON）
 * @param collectible 藏品数据
 * @returns .onft Blob
 */
export async function exportOnft(collectible: Collectible): Promise<Blob> {
  // 获取图片二进制数据
  let imageBuffer: ArrayBuffer | null = null;
  if (collectible.sprites && !collectible.sprites.startsWith('data:')) {
    try {
      const response = await fetch(collectible.sprites);
      if (response.ok) {
        imageBuffer = await response.arrayBuffer();
      }
    } catch (e) {
      console.warn('导出时获取图片失败，将导出不含图片的 .onft 文件:', e);
    }
  }

  // v4: 仅打包 persona + protocol + image，不嵌入身份 JSON
  return packOnft(imageBuffer, collectible.persona || '', collectible.personaProtocol || '');
}

/**
 * 导出藏品的身份信息为独立 JSON 文件
 * @param collectible 藏品数据
 * @returns 身份 JSON 字符串
 */
export function exportIdentityJson(collectible: Collectible): string {
  const identity = generateIdentityJson({
    id: collectible.id,
    name: collectible.name,
    intro: collectible.intro,
    appearance: collectible.appearance,
    story: collectible.story,
    character: collectible.character,
    persona: collectible.persona,
    personaProtocol: collectible.personaProtocol,
    createdAt: collectible.metadata?.createdAt || new Date().toISOString(),
    creator: collectible.metadata?.author || '',
    did: collectible.did,
    chainTokenId: collectible.chainTokenId,
    contractAddress: collectible.contractAddress,
    nftMetadataUri: collectible.metadataUri,
    identityUri: collectible.identityUri,
    imageUri: collectible.onftUri ? undefined : undefined, // 图片 URI 来自链上数据
    onftUri: collectible.onftUri,
  });

  return serializeIdentityJson(identity);
}

/**
 * 触发浏览器下载 .onft 文件
 */
export async function downloadOnft(collectible: Collectible): Promise<void> {
  const blob = await exportOnft(collectible);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const name = collectible.intro?.split(' - ')[0] || collectible.id;
  link.href = url;
  link.download = `${name}.onft`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 触发浏览器下载身份 JSON 文件
 */
export function downloadIdentityJson(collectible: Collectible): void {
  const jsonStr = exportIdentityJson(collectible);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const name = collectible.intro?.split(' - ')[0] || collectible.id;
  link.href = url;
  link.download = `${name}-identity.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 同时下载 .onft 文件和身份 JSON 文件（完整导出）
 */
export async function downloadOnftWithIdentity(collectible: Collectible): Promise<void> {
  await downloadOnft(collectible);
  // 短暂延迟，避免浏览器同时下载被阻止
  await new Promise(resolve => setTimeout(resolve, 300));
  downloadIdentityJson(collectible);
}

// ============================================================
// 导入 — 兼容 v1-v4
// ============================================================

/**
 * 从 .onft 文件导入藏品（兼容 v1-v4）
 * - v1-v3: 从 .onft 内嵌的 JSON 提取完整元数据
 * - v4: .onft 仅含 persona/protocol/image，元数据需从配套身份 JSON 获取
 *
 * @param file 用户选择的 .onft 文件
 * @param identityJsonFile 可选的身份 JSON 文件（v4 推荐提供）
 * @returns 导入的 Collectible 对象
 */
export async function importOnft(
  file: File,
  identityJsonFile?: File,
): Promise<Collectible> {
  const buffer = await readFileAsArrayBuffer(file);
  const { json, persona, personaProtocol, imageBuffer, version } = unpackOnft(buffer);

  // 如果有图片数据，创建 blob URL
  let sprites = '';
  if (imageBuffer) {
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    sprites = URL.createObjectURL(imageBlob);
  }

  if (version >= 4) {
    // v4: 身份 JSON 是独立文件
    let identityData: Record<string, unknown> | null = null;

    // 优先从配套的身份 JSON 文件读取
    if (identityJsonFile) {
      try {
        const jsonStr = await readFileAsText(identityJsonFile);
        identityData = parseIdentityJson(jsonStr) as unknown as Record<string, unknown>;
      } catch (e) {
        console.warn('身份 JSON 文件解析失败，将使用基础信息:', e);
      }
    }

    if (identityData) {
      // 从独立身份 JSON 构建完整的 Collectible
      const metadata = identityData.metadata as { createdAt?: string; author?: string } | undefined;
      const collectible: Collectible = {
        id: (identityData.id as string) || crypto.randomUUID(),
        name: (identityData.name as string) || '未命名潮玩',
        metadata: {
          createdAt: metadata?.createdAt || (identityData.createdAt as string) || new Date().toISOString(),
          author: metadata?.author || (identityData.creator as string) || '',
        },
        sprites,
        persona: persona || (identityData.persona as string) || '',
        personaProtocol: personaProtocol || (identityData.personaProtocol as string) || '',
        memory: [],
        intro: (identityData.intro as string) || '',
        appearance: identityData.appearance as string | undefined,
        story: (identityData.story as string) || '',
        character: (identityData.character as string) || '',
        // 链上信息
        onftUri: identityData.onftUri as string | undefined,
        identityUri: identityData.identityUri as string | undefined,
        imageUri: identityData.imageUri as string | undefined,
        chainTokenId: identityData.chainTokenId as string | undefined,
        contractAddress: identityData.contractAddress as string | undefined,
        metadataUri: identityData.nftMetadataUri as string | undefined,
        did: identityData.did as string | undefined,
      };

      add(collectible);
      return collectible;
    } else {
      // 没有身份 JSON，从 persona/protocol 中提取基础信息
      const collectible: Collectible = {
        id: crypto.randomUUID(),
        name: '导入的潮玩',
        metadata: {
          createdAt: new Date().toISOString(),
          author: '',
        },
        sprites,
        persona,
        personaProtocol,
        memory: [],
        intro: '从 .onft 文件导入（缺少身份信息）',
        story: '',
        character: '',
      };

      add(collectible);
      return collectible;
    }
  } else {
    // v1-v3: JSON 嵌入在 .onft 中
    const collectible: Collectible = {
      ...(json as Omit<Collectible, 'sprites' | 'persona' | 'personaProtocol'>),
      sprites,
      persona: persona || (json.persona as string) || '',
      personaProtocol: personaProtocol || (json.personaProtocol as string) || '',
    };

    add(collectible);
    return collectible;
  }
}

/**
 * 检测 .onft 文件的版本号
 * @returns 版本号，0 表示无效文件
 */
export async function detectOnftVersion(file: File): Promise<number> {
  // 只读取前 64 字节（header）即可判断版本
  const headerBuffer = await file.slice(0, 64).arrayBuffer();
  return readOnftVersion(headerBuffer);
}
