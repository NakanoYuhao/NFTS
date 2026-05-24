'use client';

import { useMemo } from 'react';
import {
  RainbowKitProvider,
  connectorsForWallets,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia, polygon, polygonAmoy } from 'wagmi/chains';
import { type Chain } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

// ============================================================
// 链配置：支持外部区块链网络
// 通过 NEXT_PUBLIC_CHAIN_* 环境变量可配置任意 EVM 兼容链
// ============================================================

// 构建自定义链定义（如果环境变量提供了 RPC URL 和 Chain ID）
function buildCustomChain(): Chain | null {
  const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL;
  const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (!rpcUrl || !chainIdStr) return null;

  const chainId = parseInt(chainIdStr, chainIdStr.startsWith('0x') ? 16 : 10);

  return {
    id: chainId,
    name: process.env.NEXT_PUBLIC_CHAIN_NAME || `Custom Chain ${chainId}`,
    nativeCurrency: {
      name: process.env.NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_NAME || 'Native Token',
      symbol: process.env.NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_SYMBOL || 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
    blockExplorers: process.env.NEXT_PUBLIC_CHAIN_BLOCK_EXPLORER
      ? { default: { url: process.env.NEXT_PUBLIC_CHAIN_BLOCK_EXPLORER, name: 'Block Explorer' } }
      : undefined,
  } as Chain;
}

const customChain = buildCustomChain();

// 支持的链列表：内置链 + 外部自定义链
// createConfig 要求 readonly [Chain, ...Chain[]]，所以确保第一个元素始终存在
const chainsArr = customChain
  ? [customChain, mainnet, polygon, polygonAmoy, sepolia] as const
  : [mainnet, polygon, polygonAmoy, sepolia] as const;

// 构建传输配置
const transportsObj: Record<number, ReturnType<typeof http>> = {
  [mainnet.id]: http(),
  [polygon.id]: http(),
  [polygonAmoy.id]: http('https://rpc-amoy.polygon.technology'),
  [sepolia.id]: http(),
};

// 如果有自定义链，添加其传输配置
if (customChain) {
  transportsObj[customChain.id] = http(process.env.NEXT_PUBLIC_CHAIN_RPC_URL);
}

// 注意: connectorsForWallets 必须在客户端调用（通过 next/dynamic ssr:false 保证），
// 因为 metaMaskWallet 在调用时立即检测 window.ethereum 来决定走 injected 还是 WalletConnect 通道。
// 如果在 SSR 时调用，window 为 undefined，MetaMask 会被错误地配置为 WalletConnect 通道，
// 导致 eth_requestAccounts 永远无法到达 MetaMask 扩展。
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet],
    },
  ],
  {
    appName: 'OPEN-NFTs',
    projectId,
  }
);

const config = createConfig({
  connectors,
  chains: chainsArr,
  transports: transportsObj,
  // 不使用 ssr: true，因为 Web3Provider 通过 next/dynamic ssr:false 加载，
  // 整个模块只在客户端执行，无需 SSR 水合
});

const rainbowKitTheme = lightTheme({
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

// 自定义主题色与项目配色一致
rainbowKitTheme.colors.modalBackground = '#ffffff';
rainbowKitTheme.colors.modalBorder = '#e5e7eb';
rainbowKitTheme.colors.accentColor = '#14b8a6';
rainbowKitTheme.colors.accentColorForeground = '#ffffff';
rainbowKitTheme.colors.closeButton = '#9ca3af';
rainbowKitTheme.colors.closeButtonBackground = '#f3f4f6';
rainbowKitTheme.colors.profileForeground = '#111827';

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
