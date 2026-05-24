'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    ethereum?: any;
  }
}

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  ArrowLeft, Shield, Check, AlertCircle, ExternalLink,
  Droplets, Loader2, FolderOpen,
} from 'lucide-react';
import {
  OPEN_NFT_ABI,
  getContractAddress,
  getCurrentChainConfig,
  getTxExplorerUrl,
} from '@/lib/nft-contract';

const REGULATOR_URL = '/regulator';

// ---- 钱包连接（环境变量驱动链配置）----

async function connectWallet(): Promise<{ signer: ethers.JsonRpcSigner; address: string }> {
  if (!window.ethereum) throw new Error('请安装 MetaMask 插件');

  // 从环境变量读取目标链配置（支持 Polygon / 自定义链）
  const config = getCurrentChainConfig();
  const chainIdHex = `0x${config.chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: config.name,
            nativeCurrency: {
              name: config.nativeCurrency.name,
              symbol: config.nativeCurrency.symbol,
              decimals: config.nativeCurrency.decimals,
            },
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: config.blockExplorer ? [config.blockExplorer] : undefined,
          }],
        });
      } catch { /* 用户拒绝添加，继续 */ }
    }
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { signer, address };
}

async function getBalance(address: string): Promise<ethers.BigNumberish> {
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getBalance(address);
}

interface NftApplyPageProps {
  collectible: import('@/types').Collectible;
  onNavigate: (page: import('@/types').PageType) => void;
  onApplyNftId: (id: string, nftData: {
    nftStatus: import('@/types').NftStatus;
    nftId?: string;
    nftApplyTime?: string;
    nftTxHash?: string;
    nftBlockNumber?: number;
    contractAddress?: string;
    chainTokenId?: string;
    metadataUri?: string;
    identityUri?: string;
    did?: string;
  }) => void;
}

type StepType = 'wallet' | 'minting' | 'done' | 'error';

export default function NftApplyPage({
  collectible,
  onNavigate,
  onApplyNftId,
}: NftApplyPageProps) {
  const collectibleId = collectible.id;
  const collectibleName = collectible.name;
  const chainConfig = getCurrentChainConfig();

  // 钱包状态（替代 Wagmi hooks）
  const [address, setAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<ethers.BigNumberish>(BigInt(0));

  const [step, setStep] = useState<StepType>('wallet');
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [mintingStatus, setMintingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 铸造状态
  const [metadataIpfsUri, setMetadataIpfsUri] = useState<string>('');
  const [identityIpfsUri, setIdentityIpfsUri] = useState<string>('');
  const [did, setDid] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [chainName, setChainName] = useState<string>('');
  const [mintTxHash, setMintTxHash] = useState<string>('');
  const [mintBlockNumber, setMintBlockNumber] = useState<number | undefined>();

  const hasBalance = typeof balance === 'bigint' ? balance > BigInt(0) : Number(balance) > 0;
  const canMint = isConnected && !!getContractAddress();

  const stepOrder: StepType[] = ['wallet', 'minting', 'done', 'error'];

  // ---- 连接钱包（ethers.js 替代 Wagmi）----
  const handleConnect = useCallback(async () => {
    try {
      const { signer: s, address: addr } = await connectWallet();
      setSigner(s);
      setAddress(addr);
      setIsConnected(true);
      const bal = await getBalance(addr);
      setBalance(bal);
    } catch (err: any) {
      setErrorMessage(err.message || '连接钱包失败');
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setSigner(null);
    setAddress('');
    setIsConnected(false);
    setBalance(BigInt(0));
  }, []);

  const handleCreateWallet = useCallback(async () => {
    setCreatingWallet(true);
    try {
      if (typeof window !== 'undefined' && typeof window.ethereum === 'undefined') {
        window.open('https://metamask.io/download/', '_blank');
      } else {
        // MetaMask 已安装，直接连接钱包
        await handleConnect();
      }
    } catch {
      // 用户取消或出错，静默处理
    } finally {
      setCreatingWallet(false);
    }
  }, [handleConnect]);

  // ---- 铸造 NFT（ethers.js 替代 Wagmi writeContract）----
  const handleMint = useCallback(async () => {
    if (!address || !canMint || !signer) return;

    setStep('minting');
    setMintingStatus('正在上传身份信息和元数据到 IPFS...');

    try {
      const currentContractAddress = getContractAddress();
      const response = await fetch('/api/nft/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectibleId,
          recipientAddress: address,
          contractAddress: currentContractAddress,
          collectibleData: {
            name: collectible.name,
            intro: collectible.intro,
            appearance: collectible.appearance,
            story: collectible.story,
            character: collectible.character,
            sprites: collectible.sprites,
            persona: collectible.persona,
            personaProtocol: collectible.personaProtocol,
            did: collectible.did,
            metadata: collectible.metadata,
          },
        }),
      });

      const data = await response.json();
      if (!data.success) {
        setErrorMessage(data.error || '元数据上传失败');
        setStep('error');
        return;
      }

      setMetadataIpfsUri(data.data.metadataIpfsUri);
      setIdentityIpfsUri(data.data.identityIpfsUri);
      setDid(data.data.did || '');
      setContractAddress(data.data.contractAddress);
      setChainName(data.data.chainName);

      setMintingStatus('身份信息已上传，请在钱包中确认铸造交易...');

      // ethers.js 直接调用合约（替代 Wagmi writeContract）
      const ca = (data.data.contractAddress || currentContractAddress) as `0x${string}`;
      if (!ca) {
        setErrorMessage('合约地址未配置，无法铸造');
        setStep('error');
        return;
      }

      const contract = new ethers.Contract(ca, OPEN_NFT_ABI as any, signer);
      const mintFn = data.data.mintFunctionName || 'safeMint';
      const args = data.data.mintArgs as [string, string];
      const tx = await contract[mintFn](...args);

      setMintTxHash(tx.hash);
      setMintingStatus('交易已提交，等待区块确认...');

      const receipt = await tx.wait();
      setMintBlockNumber(Number(receipt.blockNumber));

      // 提取 tokenId
      let tokenId: string | undefined;
      try {
        const transferLog = receipt.logs.find((log: any) => {
          try {
            return log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          } catch { return false; }
        });
        if (transferLog && transferLog.topics[3]) {
          tokenId = BigInt(transferLog.topics[3]).toString();
        }
      } catch { /* ignore */ }

      setMintingStatus('NFT 铸造成功！交易已确认。');
      setStep('done');

      onApplyNftId(collectibleId, {
        nftStatus: 'minted',
        nftId: tokenId ? `NFT-${tokenId}` : `NFT-block-${receipt.blockNumber}`,
        nftApplyTime: new Date().toISOString(),
        nftTxHash: tx.hash,
        nftBlockNumber: Number(receipt.blockNumber),
        contractAddress: ca,
        chainTokenId: tokenId,
        metadataUri: metadataIpfsUri || data.data.metadataIpfsUri,
        identityUri: identityIpfsUri || data.data.identityIpfsUri,
        did: did || data.data.did,
      });

    } catch (err: any) {
      const msg = err.reason || err.message || '网络错误';
      setErrorMessage(msg.includes('UserRejected') ? '用户拒绝了交易' : msg.slice(0, 200));
      setStep('error');
    }
  }, [address, canMint, signer, collectibleId, collectible, onApplyNftId, metadataIpfsUri, identityIpfsUri, did]);

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // 打开二创监管平台
  const openRegulator = (collectibleName: string, identityCid: string, tokenId: string | undefined) => {
    const params = new URLSearchParams();
    if (identityCid) params.set('onftCid', identityCid);
    if (tokenId) params.set('tokenId', tokenId);
    params.set('name', encodeURIComponent(collectibleName));
    params.set('source', 'opennft');
    window.open(`${REGULATOR_URL}/index.html#/ip-assets/register?${params.toString()}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="bg-surface sticky top-0 z-40 border-b border-outline-variant/20 h-14 flex items-center px-4 gap-3">
        <button onClick={() => onNavigate('detail')} className="text-on-surface hover:text-on-surface/70 font-medium text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-base font-bold text-on-surface">铸造 NFT</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 藏品信息卡片 */}
        <div className="mb-6 p-4 bg-surface-container-lowest rounded-2xl shadow-card">
          <p className="text-sm text-on-surface-variant">正在为以下藏品铸造 NFT：</p>
          <p className="text-lg font-bold text-on-surface mt-1">{collectibleName}</p>
          <p className="text-xs text-on-surface-variant mt-1">ID: {collectibleId}</p>
        </div>

        {/* 数字藏品三件套说明 */}
        <div className="mb-6 p-3 bg-teal-50 border border-teal-200 rounded-xl">
          <p className="text-xs font-semibold text-teal-800 mb-2">数字藏品包含：</p>
          <div className="space-y-1 text-xs text-teal-700">
            <p>1. 身份信息 JSON — 藏品的数字身份证</p>
            <p>2. 藏品图片 — 藏品的视觉呈现</p>
            <p>3. ERC-721 元数据 — 合约引用的链上元数据</p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: 'wallet' as StepType, label: '1. 连接钱包' },
            { key: 'minting' as StepType, label: '2. 铸造NFT' },
          ].map((s, i) => {
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = stepOrder.indexOf(s.key);
            const isCompleted = currentIdx > thisIdx;
            const isActive = step === s.key;
            return (
              <div key={s.key} className="flex items-center gap-1.5 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted ? 'bg-primary text-on-primary'
                    : isActive ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs ${isCompleted || isActive ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ============ Step 1: 钱包连接 ============ */}
        {step === 'wallet' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-on-surface">连接你的钱包</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              NFT 将铸造到你的钱包地址。私钥只在你的设备上，永远不会经过服务器。
            </p>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
              <p className="text-xs text-teal-800">
                <span className="font-semibold">网络：</span>
                将自动切换到 Hardhat 本地链 (chainId=1337)，与二创监管平台共享同一链。
              </p>
            </div>

            {isConnected && address ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary-container border border-primary/20 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-on-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-primary font-semibold">钱包已连接</p>
                      <p className="text-xs text-primary/70 break-all">{truncateAddress(address)}</p>
                    </div>
                  </div>
                  <button onClick={handleDisconnect} className="mt-3 text-xs text-destructive hover:text-destructive/80 font-medium">
                    断开连接
                  </button>
                </div>

                <div className={`p-4 rounded-2xl border-2 transition-colors ${
                  hasBalance
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {hasBalance ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Droplets className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-on-surface">钱包余额</p>
                      <p className="text-xs text-on-surface-variant">
                        {hasBalance
                          ? `${ethers.formatEther(balance).slice(0, 6)} ETH`
                          : '余额为 0，可能需要原生代币支付 Gas'}
                      </p>
                    </div>
                  </div>
                </div>

                <button onClick={handleMint} disabled={!canMint}
                  className="w-full py-3.5 bg-secondary text-on-secondary font-semibold rounded-2xl hover:bg-secondary/90 active:scale-[0.98] transition-all shadow-card hover:shadow-float text-base disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed">
                  铸造 NFT
                </button>

                {!getContractAddress() && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-800 font-medium">
                      合约地址未配置，请设置 NEXT_PUBLIC_NFT_CONTRACT_ADDRESS 环境变量。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={handleConnect} className="w-full py-3.5 bg-primary text-on-primary font-semibold rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-card hover:shadow-float text-base">
                  连接钱包
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 border-t border-outline-variant" />
                  <span className="text-xs text-on-surface-variant">或者</span>
                  <div className="flex-1 border-t border-outline-variant" />
                </div>

                <button onClick={handleCreateWallet} disabled={creatingWallet}
                  className="w-full p-4 bg-secondary-container border-2 border-secondary/20 rounded-2xl text-left hover:border-secondary/40 hover:shadow-card transition-all disabled:opacity-50">
                  <p className="font-medium text-secondary">{creatingWallet ? '正在打开 MetaMask...' : '创建新钱包 (MetaMask)'}</p>
                  <p className="text-xs text-secondary/70 mt-1">私钥仅在您的设备本地生成</p>
                </button>
              </>
            )}
          </div>
        )}

        {/* ============ Step 2: 铸造中 ============ */}
        {step === 'minting' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-on-surface">正在铸造 NFT</h2>
            <p className="text-sm text-on-surface-variant">{mintingStatus}</p>

            <div className="space-y-2 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${identityIpfsUri ? 'bg-green-500' : 'bg-primary animate-pulse'}`} />
                <span className="text-xs text-on-surface-variant">
                  {identityIpfsUri ? '身份信息已上传到 IPFS' : '正在上传身份信息到 IPFS...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${metadataIpfsUri ? 'bg-green-500' : 'bg-primary animate-pulse'}`} />
                <span className="text-xs text-on-surface-variant">
                  {metadataIpfsUri ? '元数据已上传到 IPFS' : '正在上传元数据到 IPFS...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${mintTxHash ? 'bg-green-500' : 'bg-primary animate-pulse'}`} />
                <span className="text-xs text-on-surface-variant">
                  {mintTxHash ? '交易已提交' : '等待上传完成'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${mintBlockNumber ? 'bg-green-500' : mintTxHash ? 'bg-primary animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-xs text-on-surface-variant">
                  {mintBlockNumber ? '交易已确认' : mintTxHash ? '等待区块确认...' : '等待交易提交'}
                </span>
              </div>
            </div>

            {mintTxHash && (
              <a href={getTxExplorerUrl(mintTxHash as `0x${string}`)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                在区块浏览器中查看 <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <p className="text-xs text-on-surface-variant">请勿关闭页面，区块链确认需要一定时间</p>
          </div>
        )}

        {/* ============ Step 3: 完成 ============ */}
        {step === 'done' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-on-surface">NFT 铸造成功！</h2>
            <p className="text-sm text-on-surface-variant">
              你的潮玩「{collectibleName}」已成功铸造为 NFT 数字藏品
            </p>

            {mintTxHash && (
              <div className="p-4 bg-gray-50 rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">交易哈希</span>
                  <a href={getTxExplorerUrl(mintTxHash as `0x${string}`)} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    {truncateAddress(mintTxHash)} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {mintBlockNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">区块号</span>
                    <span className="text-xs text-gray-700">#{mintBlockNumber}</span>
                  </div>
                )}
                {chainName && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">链</span>
                    <span className="text-xs text-gray-700">{chainName}</span>
                  </div>
                )}
                {contractAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">合约</span>
                    <span className="text-xs text-gray-700">{truncateAddress(contractAddress)}</span>
                  </div>
                )}
                {did && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">DID</span>
                    <span className="text-xs text-gray-700 truncate max-w-[180px]">{did}</span>
                  </div>
                )}
              </div>
            )}

            {/* ---- 新增：登记为二创原作 ---- */}
            <div className="p-4 bg-teal-50 border-2 border-teal-300 rounded-2xl text-left">
              <div className="flex items-start gap-3">
                <FolderOpen className="w-6 h-6 text-teal-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-teal-900 text-sm">登记为二创原作</p>
                  <p className="text-xs text-teal-700 mt-1">
                    将此藏品注册到二创监管平台，设定版税率和创作规则，开启衍生品授权管理。
                  </p>
                  <button
                    onClick={() => openRegulator(collectibleName, identityIpfsUri, undefined)}
                    className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    在新标签页中登记
                  </button>
                </div>
              </div>
            </div>

            {/* 数字藏品三件套说明 */}
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-left">
              <p className="text-xs font-semibold text-teal-800 mb-1">已上链的数字藏品包含：</p>
              <ul className="text-xs text-teal-700 space-y-0.5 list-disc list-inside">
                <li>身份信息 JSON（{identityIpfsUri ? '已上传 IPFS' : '未上传'}）</li>
                <li>ERC-721 元数据（{metadataIpfsUri ? '已上传 IPFS' : '未上传'}）</li>
                <li>.onft 包（身份JSON + 图片）</li>
              </ul>
            </div>

            <button onClick={() => onNavigate('detail')}
              className="mt-4 px-8 py-3 bg-primary text-on-primary font-medium rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all">
              返回藏品详情
            </button>
          </div>
        )}

        {/* ============ Error ============ */}
        {step === 'error' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-on-surface">铸造失败</h2>
            <p className="text-sm text-destructive max-w-sm mx-auto">{errorMessage}</p>

            {mintTxHash && (
              <a href={getTxExplorerUrl(mintTxHash as `0x${string}`)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                在区块浏览器中查看交易 <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button onClick={() => setStep('wallet')}
              className="mt-4 px-8 py-3 border-2 border-border text-on-surface font-medium rounded-2xl hover:bg-surface-container-lowest transition-all">
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
