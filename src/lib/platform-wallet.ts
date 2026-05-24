/**
 * 后端平台钱包工具
 *
 * 在新的真实铸造流程中，平台钱包仅用于：
 * 1. 部署 NFT 智能合约（scripts/deploy-contract.ts）
 * 2. 未来可能的平台代付 Gas 功能
 *
 * 铸造 NFT 由用户钱包直接调用智能合约完成，用户自行付 Gas。
 * 平台钱包不再参与日常铸造流程。
 *
 * 私钥存储在环境变量中，永远不暴露给前端
 */

import { ethers } from 'ethers';

// ERC-721 标准合约 ABI（仅包含部署和查询所需的函数）
const ERC721_ABI = [
  'function mint(address to, string tokenURI) external returns (uint256)',
  'function safeMint(address to, string uri) external returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
];

// 环境变量配置
function getPlatformWalletConfig() {
  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

  if (!privateKey || !rpcUrl) {
    return null;
  }

  return { privateKey, rpcUrl, contractAddress };
}

/**
 * 获取平台钱包实例
 * 私钥只在服务器端使用，永远不传输到前端
 */
export function getPlatformWallet() {
  const config = getPlatformWalletConfig();
  if (!config) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  return {
    wallet,
    provider,
    contractAddress: config.contractAddress,
  };
}

/**
 * 平台代付铸造 NFT（可选功能）
 *
 * 默认情况下，用户自行付 Gas 铸造。
 * 此方法仅在平台选择代付 Gas 时使用。
 */
export async function mintNft(params: {
  recipientAddress: string;
  tokenURI: string;    // IPFS 上的元数据 URI (ipfs://...)
}): Promise<{
  txHash: string;
  blockNumber: number;
  tokenId?: string;
}> {
  const platform = getPlatformWallet();
  if (!platform) {
    throw new Error('平台钱包未配置。请设置环境变量：PLATFORM_WALLET_PRIVATE_KEY, BLOCKCHAIN_RPC_URL');
  }

  if (!platform.contractAddress) {
    throw new Error('NFT 合约地址未配置');
  }

  const contract = new ethers.Contract(
    platform.contractAddress,
    ERC721_ABI,
    platform.wallet
  );

  // 优先使用 safeMint，降级使用 mint
  let tx: ethers.ContractTransactionResponse;
  try {
    tx = await contract.safeMint(params.recipientAddress, params.tokenURI);
  } catch {
    try {
      tx = await contract.mint(params.recipientAddress, params.tokenURI);
    } catch {
      throw new Error('合约 mint 调用失败，请检查合约 ABI 是否兼容');
    }
  }

  // 等待交易确认
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error('交易未获得确认');
  }

  // 尝试从事件日志中解析 tokenId
  let tokenId: string | undefined;
  try {
    const transferEvent = receipt.logs
      .map((log: ethers.Log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: ethers.LogDescription | null) => event?.name === 'Transfer');

    if (transferEvent && transferEvent.args) {
      tokenId = transferEvent.args[2]?.toString();
    }
  } catch {
    // 解析失败不影响主流程
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    tokenId,
  };
}

/**
 * 获取平台钱包地址（用于监控余额等）
 */
export function getPlatformWalletAddress(): string | null {
  const platform = getPlatformWallet();
  if (!platform) return null;
  return platform.wallet.address;
}

/**
 * 检查平台钱包配置是否就绪
 */
export function isPlatformWalletConfigured(): boolean {
  return getPlatformWalletConfig() !== null;
}
