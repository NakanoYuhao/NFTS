/**
 * NFT 元数据生成工具
 * 符合 ERC-721 标准的 metadata JSON 格式
 * 用于上传到 IPFS（如 Pinata），然后由智能合约引用
 *
 * 数字藏品三件套结构：
 *   1. 身份信息 JSON（identity.json）— 藏品的身份证文件
 *   2. 图片文件（image.png）— 藏品的视觉呈现
 *   3. ERC-721 元数据 JSON（metadata.json）— 合约引用的元数据，链接到身份JSON和图片
 */

export interface NftMetadata {
  name: string;
  description: string;
  image: string;           // 指向图片文件的 URI (ipfs://... 或 https://...)
  identity: string;        // 指向身份信息 JSON 的 URI (ipfs://...)
  external_url?: string;   // 外部链接
  animation_url?: string;  // 动画/视频文件 URI
  attributes: NftAttribute[];
}

export interface NftAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

/**
 * 从 Collectible 对象生成 ERC-721 标准元数据
 * 元数据中通过 `image` 和 `identity` 字段分别链接到图片和身份信息JSON
 */
export function generateNftMetadata(params: {
  name: string;
  intro: string;
  appearance?: string;
  story: string;
  character: string;
  spritesIpfsUri?: string;   // 藏品图片的 IPFS URI
  spritesUrl?: string;       // 藏品图片的 HTTP URL (备用)
  identityIpfsUri?: string;  // 身份信息 JSON 的 IPFS URI
  onftIpfsUri?: string;      // .onft 文件的 IPFS URI
  externalUrl?: string;
  createdAt: string;
  author: string;
  did?: string;              // DID 数字身份标识符
}): NftMetadata {
  const attributes: NftAttribute[] = [
    { trait_type: '创建时间', value: params.createdAt },
    { trait_type: '创作者', value: params.author },
  ];

  // DID 数字身份（适配外部 DID 系统）
  if (params.did) {
    attributes.push({ trait_type: 'DID', value: params.did });
  }

  if (params.character) {
    // 将性格特征拆分为独立属性
    const traits = params.character.split(/[,，、;；\n]/).filter(Boolean).map(s => s.trim());
    traits.forEach((trait, i) => {
      attributes.push({
        trait_type: `性格特征 ${i + 1}`,
        value: trait,
      });
    });
  }

  // 如果性格特征较少，也加一个整体属性
  if (params.character) {
    attributes.push({
      trait_type: '性格概述',
      value: params.character,
    });
  }

  const metadata: NftMetadata = {
    name: params.name,
    description: params.intro,
    image: params.spritesIpfsUri || params.spritesUrl || '',
    identity: params.identityIpfsUri || '',  // 身份信息 JSON 的 URI
    attributes,
  };

  if (params.onftIpfsUri) {
    metadata.animation_url = params.onftIpfsUri;
  }

  if (params.externalUrl) {
    metadata.external_url = params.externalUrl;
  }

  return metadata;
}

/**
 * 将元数据序列化为 JSON 字符串
 */
export function serializeNftMetadata(metadata: NftMetadata): string {
  return JSON.stringify(metadata, null, 2);
}
