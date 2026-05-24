'use client';

import dynamic from 'next/dynamic';
import { type ReactNode } from 'react';

// 使用 dynamic + ssr: false 确保 Web3Provider（含 wagmi/RainbowKit）仅在客户端加载。
// 原因: metaMaskWallet 在模块初始化时检测 window.ethereum 来决定连接通道，
// SSR 时 window 不存在会导致 MetaMask 被错误地配置为 WalletConnect 通道，
// 从而 eth_requestAccounts 永远无法到达 MetaMask 扩展。
const Web3Provider = dynamic(
  () => import('@/lib/web3-provider').then((mod) => mod.Web3Provider),
  { ssr: false }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}
