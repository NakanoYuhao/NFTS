# Coze 部署指南

## 一键部署

1. 在 Coze（扣子编程）中导入本目录
2. Coze 自动检测 Next.js 16 项目
3. 自动安装依赖（pnpm install）
4. 自动构建并启动

## 部署后操作

### AI 创作（无需额外操作）
浏览器打开 Coze URL → 创作者模式 → 开始创作

### 价格监控（无需额外操作）
创作者模式 → 底部 📊 价格监控 → 查看热门手办价格

### 二创监管（需要本地服务）
1. 在本地计算机上启动后端：
   ```powershell
   cd regulator
   powershell -ExecutionPolicy Bypass -File resume.ps1
   ```
2. 浏览器 → 企业模式 → 自动跳转到 /regulator/
3. 或直接访问 Coze URL + /regulator/index.html

## 工作原理

```
Coze 云端                      本地计算机
──────────                     ──────────
Next.js (:5000)                Nest.js (:8080)
├── /  AI创作                    ├── PostgreSQL
├── /  价格监控                  ├── Hardhat 链 (:8545)
├── /regulator/ 二创平台 ────→  ├── IPFS (:5001)
└── /api/price-monitor/*        └── Redis (:6379)
```

Coze 部署的前端通过跨域请求 (CORS) 连接到本地后端 API。
区块链交互（MetaMask）完全在用户浏览器端完成。

## 首次配置

```bash
# 1. 安装 pnpm
npm install -g pnpm

# 2. 安装依赖
pnpm install

# 3. 本地后端首次初始化
cd regulator
# 安装依赖
cd contracts && npm install && cd ..
cd backend && npm install && npx prisma generate && npx prisma migrate dev --name init && cd ..
cd frontend && npm install && cd ..
```
