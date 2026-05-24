# NFC 潮玩二创监管平台

基于区块链（Hardhat/EVM）+ DID 去中心化身份 + 智能合约的二创监管系统。

## 项目概述

- 为 NFT 潮玩（搭配 NFC 芯片的实体玩具）建立 DID 数字身份
- 原作者通过智能合约锁定二创规则（版税率、允许类型、发行上限）
- 二创作者提交衍生作品时，合约自动校验规则
- 消费者可查看从原作到衍生品的完整溯源链

## 快速开始

### 环境要求

| 组件 | 版本 | 备注 |
|------|------|------|
| Node.js | 20+ | 推荐 v20 LTS |
| npm | 9+ | |
| PostgreSQL | 16 | 或使用 Docker Compose |
| Docker Desktop | 任意 | 可选，用于 IPFS + Redis |
| MetaMask | 任意 | 浏览器插件 |

### 一键启动（Windows）

```powershell
# 1. 复制环境变量
copy backend\.env.example backend\.env

# 2. 安装依赖（首次）
cd contracts && npm install && cd ..
cd backend && npm install && npx prisma generate && cd ..
cd frontend && npm install && cd ..

# 3. 创建数据库（首次）
# PostgreSQL 中创建数据库 nfc_registry
# 或在 backend/.env 中修改 DATABASE_URL

# 4. 初始化数据库表（首次）
cd backend && npx prisma migrate dev --name init && cd ..

# 5. 一键启动所有服务
powershell -ExecutionPolicy Bypass -File resume.ps1
```

### 浏览器操作

1. 打开 http://localhost:5173
2. 安装并打开 MetaMask → 添加网络：
   - RPC URL: http://127.0.0.1:8545
   - 链 ID: 1337
   - 货币符号: ETH
3. 导入测试账户（私钥）：
   - Account #0 (管理员): `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Account #1 (创作者): `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
4. 点击「连接 MetaMask」→ 签名 → 进入控制台
5. 按页面引导操作：注册 IP → 设定规则 → 提交衍生品 → 查看溯源

## 服务端口

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:8080 |
| Swagger 文档 | http://localhost:8080/api/docs |
| Hardhat 链 | http://127.0.0.1:8545 |
| PostgreSQL | localhost:5432 |
| IPFS | localhost:5001 |
| Redis | localhost:6379 |

## 项目结构

```
├── contracts/          # Solidity 智能合约（Hardhat）
│   ├── src/            # 7 个 .sol 合约
│   ├── script/         # 部署脚本
│   ├── verify-all.ts   # 账户认证脚本
│   └── demo.ts         # 业务流程演示
├── backend/            # Nest.js 后端 API
│   ├── src/modules/    # 7 个业务模块
│   ├── prisma/         # 数据库 Schema
│   └── fix-db.js       # 数据库修复脚本
├── frontend/           # Vue 3 前端
│   └── src/pages/      # 8 个页面
├── docker/             # Docker Compose 部署
└── resume.ps1          # Windows 一键恢复脚本
```

## 合约架构

| 合约 | 标准 | 功能 |
|------|------|------|
| CreatorRegistry | - | DID ↔ 地址绑定 + 创作者认证 |
| OriginalWork | ERC-721 | 原作 NFT + NFC 芯片绑定 |
| LicenseToken | ERC-1155 | 授权许可令牌 |
| DerivativeNFT | ERC-721 | 衍生品 NFT + 溯源 |
| DerivativeRule | - | 二创规则引擎（核心） |
| RoyaltySplitter | - | 版税自动分配 |
| NfcSealRegistry | - | NFC 芯片链上防伪 |
