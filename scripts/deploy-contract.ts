#!/usr/bin/env npx tsx
// ============================================================
// OpenNFT 合约部署脚本
//
// 使用方式：
//   1. 确保 .env 中配置了 PLATFORM_WALLET_PRIVATE_KEY 和 BLOCKCHAIN_RPC_URL
//   2. 运行: pnpm tsx scripts/deploy-contract.ts
//   3. 将输出的合约地址配置到 NEXT_PUBLIC_NFT_CONTRACT_ADDRESS
//
// Polygon Amoy 测试网（免费）：
//   - RPC: https://rpc-amoy.polygon.technology
//   - 水龙头: https://faucet.polygon.technology/
//
// Polygon 主网（极低 Gas）：
//   - RPC: https://polygon-rpc.com
// ============================================================

import { ethers } from 'ethers';

// OpenNFT 合约编译后的字节码（Solidity ^0.8.20）
// 使用 Remix (https://remix.ethereum.org) 编译 contracts/OpenNFT.sol 获取
// 如果已有字节码，请替换下方占位符
const CONTRACT_BYTECODE = process.env.CONTRACT_BYTECODE || '';

// 合约构造函数参数
const CONTRACT_NAME = 'OPEN-NFTs';
const CONTRACT_SYMBOL = 'ONFT';

// ERC-721 合约 ABI（部署 + 基础交互）
const DEPLOY_ABI = [
  'constructor(string name_, string symbol_)',
  'function safeMint(address to, string uri) external returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
];

async function main() {
  console.log('=== OpenNFT 合约部署工具 ===\n');

  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;

  if (!privateKey || !rpcUrl) {
    console.error('❌ 缺少必要环境变量：');
    console.error('   PLATFORM_WALLET_PRIVATE_KEY - 部署钱包私钥');
    console.error('   BLOCKCHAIN_RPC_URL - 区块链 RPC 节点 URL');
    console.error('\n示例（Polygon Amoy 测试网）：');
    console.error('   BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology');
    console.error('   PLATFORM_WALLET_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  if (!CONTRACT_BYTECODE) {
    console.error('❌ 缺少合约字节码！');
    console.error('\n请按以下步骤操作：');
    console.error('   1. 打开 https://remix.ethereum.org');
    console.error('   2. 创建文件 OpenNFT.sol，粘贴 contracts/OpenNFT.sol 内容');
    console.error('   3. 编译合约（Solidity 0.8.20）');
    console.error('   4. 复制 BYTECODE 并设置环境变量：');
    console.error('      CONTRACT_BYTECODE=0x... pnpm tsx scripts/deploy-contract.ts');
    console.error('\n或者使用其他部署方式：');
    console.error('   - Hardhat: npx hardhat run scripts/deploy.js --network amoy');
    console.error('   - Foundry: forge create contracts/OpenNFT.sol:OpenNFT --rpc-url $RPC --private-key $KEY');
    process.exit(1);
  }

  // 连接到区块链
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log(`📡 RPC: ${rpcUrl}`);
  console.log(`👛 部署钱包: ${wallet.address}`);
  console.log(`💰 余额: ${ethers.formatEther(balance)} MATIC\n`);

  if (balance === BigInt(0)) {
    console.error('❌ 钱包余额为 0，无法支付 Gas！');
    console.error('\n测试网水龙头：');
    console.error('   Polygon Amoy: https://faucet.polygon.technology/');
    process.exit(1);
  }

  // 部署合约
  console.log('⏳ 正在部署合约...');

  const factory = new ethers.ContractFactory(DEPLOY_ABI, CONTRACT_BYTECODE, wallet);
  const contract = await factory.deploy(CONTRACT_NAME, CONTRACT_SYMBOL);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log('\n✅ 合约部署成功！');
  console.log(`📋 合约地址: ${contractAddress}`);
  console.log(`🔗 交易哈希: ${deployTx?.hash || 'unknown'}`);

  // 验证部署
  try {
    const contractInstance = new ethers.Contract(contractAddress, DEPLOY_ABI, provider);
    const name = await contractInstance.name();
    const symbol = await contractInstance.symbol();
    console.log(`🏷️  名称: ${name} (${symbol})`);
  } catch {
    console.log('⚠️  无法读取合约名称（可能需要等待区块确认）');
  }

  console.log('\n📝 请将以下环境变量添加到 .env 文件：');
  console.log(`   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${contractAddress}`);

  // 检测链
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId === 80002) {
    console.log('\n🌐 当前链: Polygon Amoy 测试网（免费）');
    console.log(`   区块浏览器: https://amoy.polygonscan.com/address/${contractAddress}`);
  } else if (chainId === 137) {
    console.log('\n🌐 当前链: Polygon 主网');
    console.log(`   区块浏览器: https://polygonscan.com/address/${contractAddress}`);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('❌ 部署失败:', msg);
  process.exit(1);
});
