import { ethers } from 'ethers';

// ========== 合约地址（环境变量可覆盖，默认 Hardhat 确定性部署） ==========
const CONTRACTS = {
  CreatorRegistry: import.meta.env.VITE_CONTRACT_CREATORREGISTRY || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  OriginalWork:    import.meta.env.VITE_CONTRACT_ORIGINALWORK    || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  LicenseToken:    import.meta.env.VITE_CONTRACT_LICENSETOKEN    || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  DerivativeNFT:   import.meta.env.VITE_CONTRACT_DERIVATIVENFT   || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  DerivativeRule:  import.meta.env.VITE_CONTRACT_DERIVATIVERULE  || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  RoyaltySplitter: import.meta.env.VITE_CONTRACT_ROYALTYSPLITTER || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  NfcSealRegistry: import.meta.env.VITE_CONTRACT_NFCSEALREGISTRY || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
};

// ========== 链配置（环境变量可覆盖） ==========
const CHAIN_CONFIG = {
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '1337', 10),
  chainIdHex: import.meta.env.VITE_CHAIN_ID_HEX || '0x539',
  chainName: import.meta.env.VITE_CHAIN_NAME || 'NFC Trendy Guard Local',
  rpcUrls: [import.meta.env.VITE_CHAIN_RPC_URL || 'http://127.0.0.1:8545'],
  nativeCurrency: {
    name: import.meta.env.VITE_CHAIN_NATIVE_CURRENCY_NAME || 'ETH',
    symbol: import.meta.env.VITE_CHAIN_NATIVE_CURRENCY_SYMBOL || 'ETH',
    decimals: 18,
  },
  blockExplorerUrl: import.meta.env.VITE_CHAIN_BLOCK_EXPLORER || '',
};

// ========== 精简 ABI（仅包含前端需要的方法） ==========
const ABIS = {
  CreatorRegistry: [
    'function registerCreator(address creator, string did, bytes32 didHash)',
    'function verifyCreator(address creator)',
    'function creators(address) view returns (tuple(string did,bytes32 didHash,uint256 registeredAt,bool isVerified,uint8 reputationScore))',
    'function roles(address) view returns (uint8)',
  ],
  OriginalWork: [
    'function mintOriginal(address creator, string metadataCid, bytes32 nfcChipUID, string creatorDid) returns (uint256)',
    'function ownerOf(uint256) view returns (address)',
    'function tokenCreator(uint256) view returns (address)',
    'function verifyByNfc(bytes32) view returns (uint256,address,string,bool)',
  ],
  DerivativeRule: [
    'function setPolicy(address operator, address originalContract, uint256 originalTokenId, bool allowsDerivative, bytes32[] allowedTypes, uint96 royaltyBps, uint256 maxSupply, bool requireNfc, uint256 expireTime, bool allowCommercial)',
    'function submitDerivative(address derivativeCreator, address originalContract, uint256 originalTokenId, bytes32 derivativeType, bytes32 nfcChipUID, string metadataCid) returns (uint256)',
    'function getPolicy(address,uint256) view returns (tuple(address originalCreator,bool allowsDerivative,uint96 royaltyBps,uint256 maxSupply,uint256 currentSupply,bool requireNfc,uint256 expireTime,bool allowCommercial))',
    'function traceDerivative(address,uint256) view returns (tuple(address originalContract,uint256 originalTokenId,address derivativeCreator,uint256 licenseId,bytes32 nfcChipUID,string metadataCid,bool verified,uint256 createdAt))',
    'function freezeDerivative(address,uint256)',
  ],
};

// ========== 连接钱包 ==========
export async function connectWallet(): Promise<{ signer: ethers.JsonRpcSigner; address: string }> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('请安装 MetaMask 插件');
  }

  // 自动切换到目标链
  await switchToTargetNetwork(ethereum);

  await ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { signer, address };
}

/// 自动切换到目标链（环境变量驱动）
async function switchToTargetNetwork(ethereum: any) {
  const networkConfig = {
    chainId: CHAIN_CONFIG.chainIdHex,
    chainName: CHAIN_CONFIG.chainName,
    nativeCurrency: CHAIN_CONFIG.nativeCurrency,
    rpcUrls: CHAIN_CONFIG.rpcUrls,
    blockExplorerUrls: CHAIN_CONFIG.blockExplorerUrl ? [CHAIN_CONFIG.blockExplorerUrl] : undefined,
  };

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_CONFIG.chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });
      } catch (addError) {
        console.warn('用户拒绝了添加网络请求，继续使用当前网络');
      }
    }
  }
}

// ========== 获取合约实例 ==========
function getContract(name: keyof typeof CONTRACTS, signer?: ethers.JsonRpcSigner) {
  const addr = CONTRACTS[name];
  const abi = ABIS[name];
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  if (signer) {
    return new ethers.Contract(addr, abi, signer);
  }
  // 只读模式用 provider（无需签名）
  return new ethers.Contract(addr, abi, provider);
}

// ========== 核心业务流程 ==========

/// 1. 注册 DID（前端调用 MetaMask 发起链上注册）
export async function registerDidOnChain(
  signer: ethers.JsonRpcSigner,
  creatorAddress: string,
  did: string,
  didHash: string,
): Promise<{ txHash: string }> {
  const contract = getContract('CreatorRegistry', signer);
  const tx = await contract.registerCreator(creatorAddress, did, didHash);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/// 2. 铸造原作 NFT
export async function mintOriginalOnChain(
  signer: ethers.JsonRpcSigner,
  creatorAddress: string,
  metadataCid: string,
  nfcChipUID: string,
  creatorDid: string,
): Promise<{ tokenId: number; txHash: string }> {
  const contract = getContract('OriginalWork', signer);
  const nfcHash = ethers.keccak256(ethers.toUtf8Bytes(nfcChipUID));
  const tx = await contract.mintOriginal(creatorAddress, metadataCid, nfcHash, creatorDid);
  const receipt = await tx.wait();
  // 从事件中提取 tokenId
  const iface = new ethers.Interface(ABIS.OriginalWork);
  let tokenId = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === 'OriginalMinted') {
        tokenId = Number(parsed.args.tokenId);
        break;
      }
    } catch { continue; }
  }
  return { tokenId, txHash: receipt.hash };
}

/// 3. 设定二创规则
export async function setPolicyOnChain(
  signer: ethers.JsonRpcSigner,
  operatorAddress: string,
  originalTokenId: number,
  allowedTypes: string[],
  royaltyBps: number,
  maxSupply: number,
  requireNfc: boolean,
  expireTimestamp: number,
  allowCommercial: boolean,
): Promise<{ ruleHash: string; txHash: string }> {
  const contract = getContract('DerivativeRule', signer);
  const originalWorkAddr = CONTRACTS.OriginalWork;
  const typeHashes = allowedTypes.map(t => ethers.keccak256(ethers.toUtf8Bytes(t)));

  const tx = await contract.setPolicy(
    operatorAddress, originalWorkAddr, originalTokenId,
    true, typeHashes, royaltyBps, maxSupply, requireNfc, expireTimestamp, allowCommercial,
  );
  const receipt = await tx.wait();

  const ruleHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'bool', 'bytes32[]', 'uint96', 'uint256', 'bool', 'uint256', 'bool'],
      [originalTokenId, true, typeHashes, royaltyBps, maxSupply, requireNfc, expireTimestamp, allowCommercial],
    ),
  );
  return { ruleHash, txHash: receipt.hash };
}

/// 4. 提交二创衍生品
export async function submitDerivativeOnChain(
  signer: ethers.JsonRpcSigner,
  derivativeCreator: string,
  originalTokenId: number,
  derivativeType: string,
  metadataCid: string,
  nfcChipUID: string,
): Promise<{ derivativeTokenId: number; txHash: string }> {
  const contract = getContract('DerivativeRule', signer);
  const originalWorkAddr = CONTRACTS.OriginalWork;
  const typeHash = ethers.keccak256(ethers.toUtf8Bytes(derivativeType));
  const nfcHash = nfcChipUID ? ethers.keccak256(ethers.toUtf8Bytes(nfcChipUID)) : ethers.ZeroHash;

  const tx = await contract.submitDerivative(
    derivativeCreator, originalWorkAddr, originalTokenId,
    typeHash, nfcHash, metadataCid,
  );
  const receipt = await tx.wait();

  // 提取衍生品 tokenId
  const iface = new ethers.Interface(ABIS.DerivativeRule);
  let derivativeTokenId = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === 'DerivativeRegistered') {
        derivativeTokenId = Number(parsed.args.derivativeTokenId);
        break;
      }
    } catch { continue; }
  }
  return { derivativeTokenId, txHash: receipt.hash };
}

/// 辅助：生成 DID 字符串
export function generateDid(address: string): string {
  return `did:fisco:bcos:${address.toLowerCase()}`;
}

/// 辅助：生成 DID 哈希
export function generateDidHash(didDocument: object): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(didDocument)));
}

/// 辅助：UTF-8 安全的 Base64 编码（替代原生 btoa，支持中文等非 ASCII 字符）
export function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

export { CONTRACTS };
