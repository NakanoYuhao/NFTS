# VPS 部署指南

## 前置准备

### 1. 阿里云安全组 — 开放端口

在阿里云控制台 → ECS → 安全组 → 入方向，添加：

| 端口 | 协议 | 用途 |
|------|------|------|
| 8080 | TCP | NestJS 后端 API |
| 8545 | TCP | Hardhat 区块链 RPC |
| 5001 | TCP | IPFS API |

> ⚠️ 8545 端口公开后任何人都可以向你的 Hardhat 链发送交易。如需安全，仅允许 Coze 出口 IP 或使用 Nginx 反向代理。

### 2. 连接到 VPS

```bash
ssh root@8.148.177.143
```

### 3. 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash
# 安装 Docker Compose 插件
apt-get update && apt-get install -y docker-compose-plugin
# 或使用独立 docker-compose
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

---

## 部署步骤

### Step 1: 上传项目到 VPS

在本地执行：
```bash
# 打包关键目录
cd D:\计算机编程相关\火山杯比赛项目\merge_02\NFTCraft-Studio

# 打包 regulator 后端 + Docker 配置 + 合约
tar -czf deploy.tar.gz \
  regulator/backend/src \
  regulator/backend/prisma \
  regulator/backend/package.json \
  regulator/backend/package-lock.json \
  regulator/backend/tsconfig.json \
  regulator/backend/tsconfig.build.json \
  regulator/backend/nest-cli.json \
  regulator/docker \
  hardhat.config.js \
  contracts/

# 上传到 VPS
scp deploy.tar.gz root@8.148.177.143:/root/
```

### Step 2: 在 VPS 上解压并启动

```bash
ssh root@8.148.177.143

cd /root
tar -xzf deploy.tar.gz
mkdir -p regulator/backend regulator/docker
cp -r regulator/backend/* regulator/backend/ 2>/dev/null
cp -r regulator/docker/* regulator/docker/ 2>/dev/null

# 进入 Docker 目录
cd regulator/docker

# 创建 .env 文件
cp .env.docker .env

# 构建并启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps
docker compose logs -f
```

### Step 3: 部署合约（首次）

```bash
# 等 Hardhat 节点就绪后
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# 如果返回 {"result":"0x0"}，说明 Hardhat 节点已就绪

# 然后在 VPS 上用本地 hardhat 部署合约
cd /root
npx hardhat run scripts/deploy/deploy-nft.js --network localhost
```

### Step 4: 验证后端

```bash
# 从 VPS 内部验证
curl -X POST -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}' \
  http://localhost:8080/api/auth/nonce

# 从你的本地电脑验证（测试公网访问）
curl -X POST -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}' \
  http://8.148.177.143:8080/api/auth/nonce
```

---

## Coze 平台部署

### 环境变量

在 Coze 控制台 → 项目 → 环境变量中添加（详见 `COZE_ENV.md`）：

| 变量名 | 值 |
|--------|-----|
| `BACKEND_URL` | `http://8.148.177.143:8080` |
| `NEXT_PUBLIC_CHAIN_RPC_URL` | `http://8.148.177.143:8545` |
| `NEXT_PUBLIC_CHAIN_ID` | `0x539` |
| `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` | `0x68B1D87F95878fE05B998F19b66F4baba5De1aed` |

### 部署

项目使用 `.coze` 配置，在 Coze 平台上一键部署即可。

---

## ⚠️ 已知问题：Mixed Content

Coze 部署使用 HTTPS (`https://*.dev.coze.site`)，但 VPS 提供 HTTP RPC (8545 和 8080)。

**API 不受影响**: `/api/*` 请求由 Next.js 服务器端代理到 VPS，浏览器不直接发请求，不受 Mixed Content 限制。

**区块链 RPC 受影响**: MetaMask 通过浏览器直接连接 `http://8.148.177.143:8545`（HTTP），从 HTTPS 页面发起会被浏览器阻止。

### 解决方案（选其一）

**方案 A — Nginx 反代 + SSL**（推荐）:
在 VPS 上用 Nginx + Let's Encrypt 给 8545 和 8080 套上 HTTPS。

**方案 B — 都不用 VPS，改用 Polygon 测试网**:
直接用公开的 Polygon Amoy RPC，合约也部署到 Amoy 上，免去 VPS 上的 Hardhat 链。

**方案 C — 本地演示时禁用 Mixed Content**:
Chrome 开发阶段可以点击地址栏的锁图标 → "网站设置" → 允许不安全内容。

---

## 目录结构（VPS 上）

```
/root/
├── regulator/
│   ├── backend/        # NestJS 源码
│   ├── contracts/      # Solidity 合约
│   └── docker/         # Docker 编排
├── hardhat.config.js   # Hardhat 配置
├── contracts/          # OpenNFT 合约
└── scripts/deploy/     # 部署脚本
```
