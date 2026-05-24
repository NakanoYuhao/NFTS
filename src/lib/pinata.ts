/**
 * Pinata IPFS 上传工具
 * 
 * 用于将 NFT 元数据和 .onft 文件上传到 IPFS
 * 通过 Pinata 的 API 服务实现
 * 
 * 环境变量依赖：
 * - PINATA_JWT: Pinata JWT Token（推荐）
 * - PINATA_API_KEY: Pinata API Key（备用）
 * - PINATA_SECRET_KEY: Pinata Secret Key（备用）
 */

const PINATA_API_BASE = 'https://api.pinata.cloud';

interface PinataPinResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * 检查 Pinata 是否已配置
 */
export function isPinataConfigured(): boolean {
  return !!(process.env.PINATA_JWT || 
    (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY));
}

/**
 * 获取 Pinata 请求头
 */
function getPinataHeaders(): Record<string, string> {
  const jwt = process.env.PINATA_JWT;
  if (jwt) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    };
  }

  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;
  if (apiKey && secretKey) {
    return {
      'Content-Type': 'application/json',
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    };
  }

  throw new Error('Pinata 未配置。请设置环境变量 PINATA_JWT 或 PINATA_API_KEY + PINATA_SECRET_KEY');
}

/**
 * 上传 JSON 到 IPFS
 * @param content - JSON 对象
 * @param name - 文件名标识
 * @returns IPFS CID
 */
export async function pinJsonToIpfs(
  content: Record<string, unknown>,
  name: string
): Promise<PinataPinResponse> {
  const headers = getPinataHeaders();

  const response = await fetch(`${PINATA_API_BASE}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pinataContent: content,
      pinataMetadata: {
        name,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata JSON 上传失败: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<PinataPinResponse>;
}

/**
 * 上传文件到 IPFS
 * @param fileBuffer - 文件二进制数据
 * @param fileName - 文件名
 * @param contentType - MIME 类型
 * @returns IPFS CID
 */
export async function pinFileToIpfs(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = 'application/octet-stream'
): Promise<PinataPinResponse> {
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: contentType }), fileName);

  formData.append('pinataMetadata', JSON.stringify({ name: fileName }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const headers: Record<string, string> = {};
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  } else if (apiKey && secretKey) {
    headers.pinata_api_key = apiKey;
    headers.pinata_secret_api_key = secretKey;
  }

  const response = await fetch(`${PINATA_API_BASE}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata 文件上传失败: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<PinataPinResponse>;
}

/**
 * 从 CID 构造 IPFS URI
 */
export function toIpfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

/**
 * 从 CID 构造 IPFS 网关 URL（用于浏览器展示）
 */
export function toIpfsGatewayUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
