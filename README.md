# NFTCraft-Studio

AI 潮玩创作 + 价格监控 + 区块链二创监管 —— 一站式 NFT 潮玩平台

## Coze 一键部署

在 Coze 中打开本目录，自动检测 Next.js 项目并部署。

部署后访问：

| 路径 | 功能 |
|------|------|
| `/` | AI 潮玩创作（拍照/自由创作 → 生成 persona/sprites） |
| `/` → 创作者模式 → 📊 价格监控 | 热门潮玩实时价格追踪 |
| `/regulator/` | 二创监管平台（IP 注册 → 规则 → 衍生品 → 溯源） |

## 快速启动

```bash
# Coze 部署
coze dev                                    # → http://localhost:5000

# 本地后端（二创监管 + 区块链）
cd regulator
powershell -ExecutionPolicy Bypass -File resume.ps1
```

## 功能矩阵

| 功能 | 位置 | 说明 |
|------|------|------|
| AI 潮玩创作 | 创作者模式 | 拍照/自由创作 → AI 生成外观/故事/性格/sprites |
| 藏品柜 | 底部 💎 | 管理已创作的藏品，查看详情 |
| AI 对话 | 藏品详情 → 进入对话 | 与潮玩 AI 角色人格化对话 |
| NFT 铸造 | 藏品详情 → 铸造 NFT | ethers.js + MetaMask 铸造 ERC-721 |
| 📊 价格监控 | 底部 📊 | 热门手办实时价格 + 趋势 + 跨平台搜索 |
| 🛡️ 二创监管 | 企业模式 或 /regulator/ | 原作注册/二创规则/衍生品管理/溯源链 |
| 链上认证 | 企业模式 → 防炒作 | 创作者认证 + 审计日志 |

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 + React 19 |
| UI | shadcn/ui 60+ 组件 + Tailwind CSS v4 |
| 区块链 | ethers.js v6 + MetaMask (chainId=1337) |
| AI | coze-coding-dev-sdk (LLM + 图片生成) |
| 二创监管 | Vue 3 + Ant Design Vue (静态嵌入) |
| 后端 | Nest.js + Prisma + PostgreSQL (本地) |
| 存储 | IPFS (Kubo) + Pinata |
| 合约 | 7 个 Solidity (DID/Rule/NFT) + OpenNFT.sol |

## 环境要求

| 组件 | Coze 部署 | 完整功能 |
|------|----------|---------|
| Node.js | Coze 提供 | 本地需 20+ |
| PostgreSQL | 不需要 | 本地需 16+ |
| MetaMask | 浏览器插件 | 浏览器插件 |
| IPFS/Redis | 不需要 | Docker (可选) |

## 测试账户

Admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Creator: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
私钥: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
