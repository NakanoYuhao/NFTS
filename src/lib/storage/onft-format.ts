// ============================================================
// .onft (Open-NFT Archive) 格式 v4 — 打包/解包工具
//
// v4 格式结构（身份 JSON 已分离为独立文件，便于 NFT 铸造）:
//   Header  (64 bytes, 固定)
//     ├─ Magic:          "ONFT"          (4 bytes)
//     ├─ Version:        uint16          (2 bytes)  v1=1, v2=2, v3=3, v4=4
//     ├─ Persona Length: uint32          (4 bytes)  人格锚点文本长度
//     ├─ Protocol Length:uint32          (4 bytes)  人格输出控制指令长度
//     ├─ Image Length:   uint32          (4 bytes)  图片二进制长度
//     └─ Reserved:                       (46 bytes) 预留扩展
//   Persona Payload        (变长, UTF-8 编码的人格锚点文本)
//   Protocol Payload       (变长, UTF-8 编码的人格输出控制指令)
//   Image Payload          (变长, PNG/WebP/JPEG 等图片二进制数据)
//
//   身份 JSON 是独立文件（identity.json），包含 onftUri 指向本 .onft 文件，
//   用于 ERC-721 tokenURI 引用。NFT 铸造时先上传 .onft 获得 onftUri，
//   再生成包含 onftUri 的身份 JSON 并上传。
//
// 版本演进：
//   v1: JSON + Image（最简格式）
//   v2: 身份JSON + Image（JSON 明确定义为"身份信息文件"）
//   v3: 身份JSON + Persona + Protocol + Image（人格文件独立化）
//   v4: Persona + Protocol + Image（身份 JSON 分离为独立文件，便于 NFT 铸造）
//
//   unpackOnft 自动兼容 v1、v2、v3 和 v4。
// ============================================================

const MAGIC = 0x4f4e4654; // "ONFT"
const HEADER_SIZE = 64;
const FORMAT_VERSION = 4; // v4: 身份JSON已分离，Persona + Protocol + Image

/** .onft 文件解包结果 */
export interface OnftPackage {
  /** 身份信息 JSON（v1/v2/v3 从文件中提取，v4 为空对象） */
  json: Record<string, unknown>;
  /** 人格锚点文本（v3/v4 独立文件，v1/v2 从 JSON 中提取） */
  persona: string;
  /** 人格输出控制指令 / Agentic Protocol（v3/v4 独立文件，v1/v2 从 JSON 中提取或为空） */
  personaProtocol: string;
  /** 藏品图像二进制数据 */
  imageBuffer: ArrayBuffer | null;
  /** 文件格式版本 */
  version: number;
}

// ============================================================
// 身份信息 JSON 结构定义（独立文件，不再嵌入 .onft）
// ============================================================

/** 数字藏品身份信息 JSON 结构 */
export interface DigitalCollectibleIdentity {
  /** 格式标识 */
  format: 'onft-identity-v1';
  /** 格式版本 */
  version: 1;
  /** 藏品唯一标识 */
  id: string;
  /** 藏品名称 */
  name: string;
  /** 一句话介绍 */
  intro: string;
  /** 外表描述 */
  appearance?: string;
  /** 背景故事 */
  story?: string;
  /** 性格特征 */
  character?: string;
  /** 人格锚点（AI对话用 — v3中同时作为独立文件存在） */
  persona?: string;
  /** 人格输出控制指令 / Agentic Protocol（控制AI对话时的回答策略和行为边界） */
  personaProtocol?: string;
  /** 创建时间 ISO string */
  createdAt: string;
  /** 创建者（钱包地址或 DID） */
  creator: string;
  /** DID 数字身份标识符（适配外部 DID 系统） */
  did?: string;
  /** 链上 Token ID（铸造后填写） */
  chainTokenId?: string;
  /** 合约地址（铸造后填写） */
  contractAddress?: string;
  /** ERC-721 元数据 URI（铸造后填写） */
  nftMetadataUri?: string;
  /** 身份信息 JSON 自身的 IPFS URI（上传后填写） */
  identityUri?: string;
  /** 图片文件的 IPFS URI（如已上传） */
  imageUri?: string;
  /** .onft 包的 IPFS URI（v4 核心：身份 JSON 通过此字段链接到 .onft 文件） */
  onftUri?: string;
}

/**
 * 从 Collectible 生成身份信息 JSON（独立文件，用于 NFT 铸造）
 * 这是数字藏品的"身份证文件"，与 .onft 文件共同构成完整的数字藏品
 * 身份 JSON 包含 onftUri，指向对应的 .onft 文件
 */
export function generateIdentityJson(params: {
  id: string;
  name: string;
  intro: string;
  appearance?: string;
  story?: string;
  character?: string;
  persona?: string;
  personaProtocol?: string;
  createdAt: string;
  creator: string;
  did?: string;
  chainTokenId?: string;
  contractAddress?: string;
  nftMetadataUri?: string;
  identityUri?: string;
  imageUri?: string;
  onftUri?: string;
}): DigitalCollectibleIdentity {
  const identity: DigitalCollectibleIdentity = {
    format: 'onft-identity-v1',
    version: 1,
    id: params.id,
    name: params.name,
    intro: params.intro,
    createdAt: params.createdAt,
    creator: params.creator,
  };

  // 可选字段
  if (params.appearance) identity.appearance = params.appearance;
  if (params.story) identity.story = params.story;
  if (params.character) identity.character = params.character;
  if (params.persona) identity.persona = params.persona;
  if (params.personaProtocol) identity.personaProtocol = params.personaProtocol;
  if (params.did) identity.did = params.did;
  if (params.chainTokenId) identity.chainTokenId = params.chainTokenId;
  if (params.contractAddress) identity.contractAddress = params.contractAddress;
  if (params.nftMetadataUri) identity.nftMetadataUri = params.nftMetadataUri;
  if (params.identityUri) identity.identityUri = params.identityUri;
  if (params.imageUri) identity.imageUri = params.imageUri;
  if (params.onftUri) identity.onftUri = params.onftUri;

  return identity;
}

/**
 * 将身份信息 JSON 序列化为字符串（用于导出/上传）
 */
export function serializeIdentityJson(identity: DigitalCollectibleIdentity): string {
  return JSON.stringify(identity, null, 2);
}

/**
 * 从 JSON 字符串解析身份信息
 */
export function parseIdentityJson(jsonStr: string): DigitalCollectibleIdentity {
  return JSON.parse(jsonStr) as DigitalCollectibleIdentity;
}

// ============================================================
// 打包 / 解包
// ============================================================

/**
 * 将人格文件和图片打包为 .onft 格式 Blob（v4: 无身份 JSON）
 * @param imageBuffer 图片二进制数据 (可为 null 表示无图片)
 * @param persona 人格锚点文本 (可为空字符串)
 * @param personaProtocol 人格输出控制指令 (可为空字符串)
 * @returns .onft 格式的 Blob
 */
export function packOnft(
  imageBuffer: ArrayBuffer | null,
  persona: string = '',
  personaProtocol: string = ''
): Blob {
  // 编码人格锚点
  const personaBytes = new TextEncoder().encode(persona);
  const personaLength = personaBytes.byteLength;

  // 编码人格输出控制指令
  const protocolBytes = new TextEncoder().encode(personaProtocol);
  const protocolLength = protocolBytes.byteLength;

  const imageLength = imageBuffer ? imageBuffer.byteLength : 0;

  // 构建 Header (v4)
  const header = new ArrayBuffer(HEADER_SIZE);
  const view = new DataView(header);

  // Magic
  view.setUint32(0, MAGIC, false); // big-endian
  // Version
  view.setUint16(4, FORMAT_VERSION, false);
  // Persona Length (offset 6)
  view.setUint32(6, personaLength, false);
  // Protocol Length (offset 10)
  view.setUint32(10, protocolLength, false);
  // Image Length (offset 14)
  view.setUint32(14, imageLength, false);
  // Reserved (bytes 18-63) 留零

  // 组合各部分
  const parts: BlobPart[] = [header];
  if (personaLength > 0) {
    parts.push(personaBytes);
  }
  if (protocolLength > 0) {
    parts.push(protocolBytes);
  }
  if (imageBuffer && imageLength > 0) {
    parts.push(imageBuffer);
  }

  return new Blob(parts, { type: 'application/octet-stream' });
}

/**
 * 解包 .onft 格式数据（兼容 v1、v2、v3 和 v4）
 * @param buffer .onft 文件的 ArrayBuffer
 * @returns 解包结果 { json, persona, personaProtocol, imageBuffer, version }
 * @throws 格式校验失败时抛出错误
 */
export function unpackOnft(buffer: ArrayBuffer): OnftPackage {
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error('无效的 .onft 文件：文件过小');
  }

  const view = new DataView(buffer);

  // 校验 Magic
  const magic = view.getUint32(0, false);
  if (magic !== MAGIC) {
    throw new Error(`无效的 .onft 文件：Magic 不匹配 (期望 ONFT)`);
  }

  // 读取版本
  const version = view.getUint16(4, false);
  if (version > FORMAT_VERSION) {
    throw new Error(`不支持的 .onft 版本：${version} (当前支持 ≤ ${FORMAT_VERSION})`);
  }

  if (version >= 4) {
    // v4: Persona(6) + Protocol(10) + Image(14)，无 JSON
    return unpackV4(buffer, view, version);
  } else if (version >= 3) {
    // v3: JSON(6) + Persona(10) + Protocol(14) + Image(18)
    return unpackV3(buffer, view, version);
  } else {
    // v1/v2: JSON(6) + Image(10)
    return unpackV1V2(buffer, view, version);
  }
}

/**
 * v4 解包：Persona + Protocol + Image（无 JSON）
 */
function unpackV4(buffer: ArrayBuffer, view: DataView, version: number): OnftPackage {
  const personaLength = view.getUint32(6, false);
  const protocolLength = view.getUint32(10, false);
  const imageLength = view.getUint32(14, false);

  // 校验数据完整性
  const expectedSize = HEADER_SIZE + personaLength + protocolLength + imageLength;
  if (buffer.byteLength < expectedSize) {
    throw new Error(`.onft v4 文件数据不完整：期望 ${expectedSize} 字节，实际 ${buffer.byteLength} 字节`);
  }

  // 提取人格锚点
  let persona = '';
  if (personaLength > 0) {
    const personaBytes = new Uint8Array(buffer, HEADER_SIZE, personaLength);
    persona = new TextDecoder().decode(personaBytes);
  }

  // 提取人格输出控制指令
  let personaProtocol = '';
  if (protocolLength > 0) {
    const protocolBytes = new Uint8Array(buffer, HEADER_SIZE + personaLength, protocolLength);
    personaProtocol = new TextDecoder().decode(protocolBytes);
  }

  // 提取图片
  let imageBuffer: ArrayBuffer | null = null;
  if (imageLength > 0) {
    const imageOffset = HEADER_SIZE + personaLength + protocolLength;
    imageBuffer = buffer.slice(imageOffset, imageOffset + imageLength);
  }

  return {
    json: {}, // v4 无嵌入 JSON，需从独立的身份 JSON 文件获取
    persona,
    personaProtocol,
    imageBuffer,
    version,
  };
}

/**
 * v3 解包：JSON + Persona + Protocol + Image
 */
function unpackV3(buffer: ArrayBuffer, view: DataView, version: number): OnftPackage {
  const jsonLength = view.getUint32(6, false);
  const personaLength = view.getUint32(10, false);
  const protocolLength = view.getUint32(14, false);
  const imageLength = view.getUint32(18, false);

  const imageOffset = HEADER_SIZE + jsonLength + personaLength + protocolLength;

  // 校验数据完整性
  const expectedSize = imageOffset + imageLength;
  if (buffer.byteLength < expectedSize) {
    throw new Error(`.onft v3 文件数据不完整：期望 ${expectedSize} 字节，实际 ${buffer.byteLength} 字节`);
  }

  // 解析 JSON
  const jsonBytes = new Uint8Array(buffer, HEADER_SIZE, jsonLength);
  const jsonStr = new TextDecoder().decode(jsonBytes);
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(jsonStr);
  } catch {
    throw new Error('.onft v3 文件中的 JSON 数据解析失败');
  }

  // 提取人格锚点
  let persona = '';
  if (personaLength > 0) {
    const personaBytes = new Uint8Array(buffer, HEADER_SIZE + jsonLength, personaLength);
    persona = new TextDecoder().decode(personaBytes);
  } else if (json.persona && typeof json.persona === 'string') {
    persona = json.persona;
  }

  // 提取人格输出控制指令
  let personaProtocol = '';
  if (protocolLength > 0) {
    const protocolBytes = new Uint8Array(buffer, HEADER_SIZE + jsonLength + personaLength, protocolLength);
    personaProtocol = new TextDecoder().decode(protocolBytes);
  } else if (json.personaProtocol && typeof json.personaProtocol === 'string') {
    personaProtocol = json.personaProtocol;
  }

  // 提取图片
  let imageBuffer: ArrayBuffer | null = null;
  if (imageLength > 0) {
    imageBuffer = buffer.slice(imageOffset, imageOffset + imageLength);
  }

  return { json, persona, personaProtocol, imageBuffer, version };
}

/**
 * v1/v2 解包：JSON + Image
 */
function unpackV1V2(buffer: ArrayBuffer, view: DataView, version: number): OnftPackage {
  const jsonLength = view.getUint32(6, false);
  const imageLength = view.getUint32(10, false);
  const imageOffset = HEADER_SIZE + jsonLength;

  // 校验数据完整性
  const expectedSize = imageOffset + imageLength;
  if (buffer.byteLength < expectedSize) {
    throw new Error(`.onft v${version} 文件数据不完整：期望 ${expectedSize} 字节，实际 ${buffer.byteLength} 字节`);
  }

  // 解析 JSON
  const jsonBytes = new Uint8Array(buffer, HEADER_SIZE, jsonLength);
  const jsonStr = new TextDecoder().decode(jsonBytes);
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(jsonStr);
  } catch {
    throw new Error(`.onft v${version} 文件中的 JSON 数据解析失败`);
  }

  // 从 JSON 中提取 persona/personaProtocol（v1/v2 兼容）
  const persona = (json.persona && typeof json.persona === 'string') ? json.persona : '';
  const personaProtocol = (json.personaProtocol && typeof json.personaProtocol === 'string') ? json.personaProtocol : '';

  // 提取图片
  let imageBuffer: ArrayBuffer | null = null;
  if (imageLength > 0) {
    imageBuffer = buffer.slice(imageOffset, imageOffset + imageLength);
  }

  return { json, persona, personaProtocol, imageBuffer, version };
}

/**
 * 仅读取 .onft 文件的元数据
 * - v1/v2/v3: 从文件中提取 JSON（不解包图片，性能更优）
 * - v4: 返回空对象（v4 无嵌入 JSON，需从独立身份文件获取）
 * @param buffer .onft 文件的 ArrayBuffer
 * @returns 身份信息 JSON 对象（v4 返回空对象）
 */
export function readOnftMeta(buffer: ArrayBuffer): Record<string, unknown> {
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error('无效的 .onft 文件：文件过小');
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, false);
  if (magic !== MAGIC) {
    throw new Error('无效的 .onft 文件：Magic 不匹配');
  }

  const version = view.getUint16(4, false);

  // v4 无嵌入 JSON
  if (version >= 4) {
    return {};
  }

  const jsonLength = view.getUint32(6, false);

  if (buffer.byteLength < HEADER_SIZE + jsonLength) {
    throw new Error('.onft 文件数据不完整');
  }

  const jsonBytes = new Uint8Array(buffer, HEADER_SIZE, jsonLength);
  const jsonStr = new TextDecoder().decode(jsonBytes);
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('.onft 文件中的 JSON 数据解析失败');
  }
}

/**
 * 校验 buffer 是否为有效的 .onft 文件
 */
export function isOnftFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < HEADER_SIZE) return false;
  const view = new DataView(buffer);
  return view.getUint32(0, false) === MAGIC;
}

/**
 * 读取 .onft 文件的版本号
 * @returns 版本号，或 0 表示无效文件
 */
export function readOnftVersion(buffer: ArrayBuffer): number {
  if (buffer.byteLength < HEADER_SIZE) return 0;
  const view = new DataView(buffer);
  if (view.getUint32(0, false) !== MAGIC) return 0;
  return view.getUint16(4, false);
}

/**
 * 读取文件为 ArrayBuffer（浏览器端工具函数）
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 读取文件为文本（浏览器端工具函数，用于读取身份 JSON 文件）
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
