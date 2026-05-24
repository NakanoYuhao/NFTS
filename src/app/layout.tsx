import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { FontPreload } from '@/components/FontPreload';
import { ClientProviders } from '@/components/ClientProviders';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'OPEN-NFTs | 数字潮玩创作平台',
    template: '%s | OPEN-NFTs',
  },
  description:
    'OPEN-NFTs是一个创新的NFT潮玩创作平台，通过AI技术将你的创意转化为独一无二的数字藏品，支持拍照生成和自由创作两种模式。',
  keywords: [
    'NFT',
    '潮玩',
    '数字藏品',
    'AI创作',
    'OPEN-NFTs',
    '数字艺术',
    '区块链',
  ],
  authors: [{ name: 'OPEN-NFTs Team' }],
  generator: 'Next.js',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ClientProviders>
          <FontPreload />
          {isDev && <Inspector />}
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
