import { NextResponse } from 'next/server';
import { generateNftMetadata, serializeNftMetadata } from '@/lib/nft-metadata';
import {
  pinJsonToIpfs,
  pinFileToIpfs,
  toIpfsUri,
  isPinataConfigured,
} from '@/lib/pinata';
import { packOnft, generateIdentityJson } from '@/lib/storage/onft-format';
import { getServerContractAddress, getCurrentChainConfig } from '@/lib/nft-contract';

/**
 * POST /api/nft/mint
 *
 * 铸造准备流程（v4: 身份 JSON 从 .onft 分离）：
 * 1. 接收 collectibleId + 藏品数据 + 用户钱包地址
 * 2. 打包 .onft 文件（Persona + Protocol + Image，不含身份 JSON）并上传到 IPFS
 * 3. 生成身份信息 JSON（包含 onftUri 指向 .onft 文件）并上传到 IPFS
 * 4. 生成 ERC-721 元数据 JSON（引用身份JSON + 图片）并上传到 IPFS
 * 5. 返回 IPFS URI + 合约信息，供前端调用智能合约铸造
 *
 * 数字藏品文件结构（v4）：
 *   - .onft 包: {id}.onft (IPFS, Persona + Protocol + Image 二进制)
 *   - 身份信息 JSON: {id}-identity.json (IPFS, 包含 onftUri → .onft)
 *   - ERC-721 元数据: {id}-metadata.json (IPFS, 合约 tokenURI 指向此)
 *
 * 与 v3 的区别：
 *   - v3: 身份 JSON 嵌入 .onft，需"重新上传更新后的 JSON"步骤
 *   - v4: 身份 JSON 独立，先上传 .onft 获得 onftUri，再生成包含 onftUri 的身份 JSON
 *   - 简化了流程，避免了 v3 中反复上传更新的问题
 *
 * 用户钱包自行付 Gas 费用，后端不持有私钥、不调用合约。
 *
 * 环境变量依赖：
 * - PINATA_JWT 或 PINATA_API_KEY + PINATA_SECRET_KEY: Pinata IPFS 上传
 * - NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: NFT 合约地址
 * - NEXT_PUBLIC_CHAIN_ID: 链 ID
 * - NEXT_PUBLIC_DID_METHOD: DID 方法名（可选，如 "key", "web", "ethr" 等）
 */

interface CollectibleData {
  name?: string;
  intro?: string;
  appearance?: string;
  story?: string;
  character?: string;
  sprites?: string;
  persona?: string;
  personaProtocol?: string; // 人格输出控制指令 / Agentic Protocol (v3)
  did?: string;  // DID 数字身份（用户可选提供）
  metadata?: {
    createdAt: string;
    author: string;
  };
}

interface MintRequest {
  collectibleId: string;
  recipientAddress: string;
  contractAddress?: string;
  collectibleData: CollectibleData;
  // 合约配置（适配外部智能合约）
  contractConfig?: {
    abi?: unknown;           // 自定义合约 ABI（JSON）
    functionName?: string;   // 自定义铸造函数名（默认 safeMint）
    args?: unknown[];        // 自定义函数参数
  };
}

export async function POST(request: Request) {
  try {
    const body: MintRequest = await request.json();
    const { collectibleId, recipientAddress, collectibleData, contractConfig } = body;

    // 参数校验
    if (!collectibleId || !recipientAddress) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：collectibleId 或 recipientAddress' },
        { status: 400 }
      );
    }

    // 校验合约地址（请求体传入 > 环境变量）
    const contractAddress = (body.contractAddress && /^0x[a-fA-F0-9]{40}$/.test(body.contractAddress)
      ? body.contractAddress
      : getServerContractAddress()) as `0x${string}` | undefined;
    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: 'NFT 合约地址未配置。请设置 NEXT_PUBLIC_NFT_CONTRACT_ADDRESS 环境变量，或在请求中传入 contractAddress。' },
        { status: 400 }
      );
    }

    // 获取链配置
    const chainConfig = getCurrentChainConfig();

    // DID 标识符（优先使用前端传入的，否则按默认方法生成）
    const didMethod = process.env.NEXT_PUBLIC_DID_METHOD || 'ethr';
    const did = collectibleData.did || `${didMethod}:${recipientAddress}`;

    let metadataIpfsUri: string;
    let identityIpfsUri: string;
    let onftIpfsUri: string;
    let imageIpfsUri: string | undefined;
    let ipfsUploadReal = false;

    // ============================================================
    // IPFS 上传流程（v4: .onft 先行，身份 JSON 后行）
    // ============================================================
    if (isPinataConfigured()) {
      try {
        // ---- Step 1: 上传图片到 IPFS（如有）----
        if (collectibleData.sprites?.startsWith('data:')) {
          try {
            const base64 = collectibleData.sprites.split(',')[1];
            if (base64) {
              const binaryStr = atob(base64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              const imageBuffer = Buffer.from(bytes);
              const imageResult = await pinFileToIpfs(
                imageBuffer,
                `${collectibleId}-image.png`,
                'image/png'
              );
              imageIpfsUri = toIpfsUri(imageResult.IpfsHash);
            }
          } catch (imgErr) {
            console.warn('图片上传 IPFS 失败，继续流程:', imgErr);
          }
        }

        // ---- Step 2: 打包 .onft v4 并上传（Persona + Protocol + Image，不含 JSON）----
        let imageBufferForOnft: ArrayBuffer | null = null;
        if (collectibleData.sprites?.startsWith('data:')) {
          try {
            const base64 = collectibleData.sprites.split(',')[1];
            if (base64) {
              const binaryStr = atob(base64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              imageBufferForOnft = bytes.buffer;
            }
          } catch {
            // 图片转换失败不影响主流程
          }
        }

        const onftBlob = packOnft(imageBufferForOnft, collectibleData.persona || '', collectibleData.personaProtocol || '');
        const onftBuffer = Buffer.from(await onftBlob.arrayBuffer());

        const onftResult = await pinFileToIpfs(
          onftBuffer,
          `${collectibleId}.onft`,
          'application/octet-stream'
        );
        onftIpfsUri = toIpfsUri(onftResult.IpfsHash);

        // ---- Step 3: 生成身份信息 JSON（包含 onftUri）并上传 ----
        const identity = generateIdentityJson({
          id: collectibleId,
          name: collectibleData.name || '未命名潮玩',
          intro: collectibleData.intro || '',
          appearance: collectibleData.appearance,
          story: collectibleData.story,
          character: collectibleData.character,
          persona: collectibleData.persona,
          personaProtocol: collectibleData.personaProtocol,
          createdAt: collectibleData.metadata?.createdAt || new Date().toISOString(),
          creator: recipientAddress,
          did,
          onftUri: onftIpfsUri,  // v4 核心：身份 JSON 包含 .onft 文件链接
          imageUri: imageIpfsUri,
        });

        const identityResult = await pinJsonToIpfs(
          identity as unknown as Record<string, unknown>,
          `${collectibleId}-identity.json`
        );
        identityIpfsUri = toIpfsUri(identityResult.IpfsHash);

        // 更新身份 JSON 中的 identityUri 自引用
        identity.identityUri = identityIpfsUri;

        // ---- Step 4: 生成 ERC-721 元数据并上传 ----
        const metadata = generateNftMetadata({
          name: collectibleData.name || '未命名潮玩',
          intro: collectibleData.intro || '',
          appearance: collectibleData.appearance,
          story: collectibleData.story || '',
          character: collectibleData.character || '',
          spritesIpfsUri: imageIpfsUri,
          spritesUrl: collectibleData.sprites?.startsWith('http') ? collectibleData.sprites : undefined,
          identityIpfsUri,
          onftIpfsUri,
          externalUrl: `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || ''}`,
          createdAt: collectibleData.metadata?.createdAt || new Date().toISOString(),
          author: collectibleData.metadata?.author || recipientAddress,
          did,
        });

        const metadataResult = await pinJsonToIpfs(
          metadata as unknown as Record<string, unknown>,
          `${collectibleId}-metadata.json`
        );
        metadataIpfsUri = toIpfsUri(metadataResult.IpfsHash);

        ipfsUploadReal = true;
      } catch (ipfsError) {
        const msg = ipfsError instanceof Error ? ipfsError.message : 'IPFS 上传失败';
        console.error('IPFS 上传失败:', msg);
        // IPFS 上传失败时回退到占位 URI
        metadataIpfsUri = `ipfs://QmMetadataPlaceholder-${collectibleId.slice(0, 8)}`;
        identityIpfsUri = `ipfs://QmIdentityPlaceholder-${collectibleId.slice(0, 8)}`;
        onftIpfsUri = `ipfs://QmOnftPlaceholder-${collectibleId.slice(0, 8)}`;
      }
    } else {
      // Pinata 未配置，使用占位 URI
      metadataIpfsUri = `ipfs://QmMetadataPlaceholder-${collectibleId.slice(0, 8)}`;
      identityIpfsUri = `ipfs://QmIdentityPlaceholder-${collectibleId.slice(0, 8)}`;
      onftIpfsUri = `ipfs://QmOnftPlaceholder-${collectibleId.slice(0, 8)}`;
    }

    // ============================================================
    // 确定合约调用方式（适配外部智能合约）
    // ============================================================
    const mintFunctionName = contractConfig?.functionName || 'safeMint';

    // 构建合约调用参数
    // 默认: safeMint(address to, string uri)
    // 外部合约可自定义函数名和参数
    let mintArgs: unknown[];
    if (contractConfig?.args) {
      mintArgs = contractConfig.args;
    } else {
      // 默认参数：[recipientAddress, metadataIpfsUri]
      mintArgs = [recipientAddress, metadataIpfsUri];
    }

    // ============================================================
    // 返回铸造准备数据
    // ============================================================
    const response = {
      success: true,
      data: {
        // 铸造所需数据
        collectibleId,
        recipientAddress,
        metadataIpfsUri,
        identityIpfsUri,
        onftIpfsUri,
        imageIpfsUri,
        did,
        // 合约调用信息（适配外部合约）
        contractAddress,
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        blockExplorer: chainConfig.blockExplorer,
        mintFunctionName,
        mintArgs,
        // 时间戳
        preparedAt: new Date().toISOString(),
        // 配置状态
        _status: {
          ipfsUpload: ipfsUploadReal,
          contractConfigured: true,
          metadataGenerated: true,
          identityGenerated: true,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : '铸造准备失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
