# VPS 部署 — 简化指南

## 部署包已生成

文件: `vps-deploy.tar.gz` (116KB)  
目标: 阿里云 ECS 8.148.177.143

## 步骤

### 1. 上传部署包

通过阿里云 ECS 控制台 → 远程连接 → 文件上传 → 选择 `vps-deploy.tar.gz`

或在能连 SSH 的终端执行:
```bash
scp -i nfc_key.pem vps-deploy.tar.gz root@8.148.177.143:/root/
```

### 2. 登录 VPS

阿里云控制台 → ECS → 远程连接 即可打开 Web 终端。

### 3. 解压并部署

```bash
cd /root
tar -xzf vps-deploy.tar.gz
cd regulator/docker

# 构建并启动所有服务
docker compose up -d --build

# 查看日志，等待 hardhat 就绪
docker compose logs -f hardhat
# 看到 "Account #0" 和 "Started HTTP" 后按 Ctrl+C
```

### 4. 部署合约

```bash
# 进入容器部署所有 8 个合约
docker compose exec hardhat npx hardhat run scripts/deploy/deploy-all.js --network localhost

# 记录输出的合约地址，复制到后面用
```

输出类似：
```
OpenNFT: 0x...
CreatorRegistry: 0x...
OriginalWork: 0x...
... (8个地址)
```

### 5. 更新并重启后端

在阿里云安全组开放端口: **8080, 8545, 5001** (TCP，入方向，0.0.0.0/0)

```bash
# 查看后端状态
docker compose ps
docker compose logs backend

# 如果后端因缺少合约地址报错，需要:
# 把第4步得到的合约地址填入环境变量，重启
docker compose down
# 编辑 docker-compose.yml 的 backend.environment 部分
docker compose up -d
```

### 6. 验证

```bash
# 从 VPS 本地测试
curl -X POST -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}' \
  http://localhost:8080/api/auth/nonce

# 从你的电脑测试（确认公网可访问）
curl -X POST -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}' \
  http://8.148.177.143:8080/api/auth/nonce
```

### 7. Coze 平台配置

在 Coze 控制台添加环境变量：
- `BACKEND_URL=http://8.148.177.143:8080`
- `NEXT_PUBLIC_CHAIN_RPC_URL=http://8.148.177.143:8545`
- `NEXT_PUBLIC_CHAIN_ID=0x539`
- `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=` (第4步部署得到的 OpenNFT 地址)

然后部署到 Coze。AI 功能在 Coze 上自动恢复。

---

## 故障排查

| 问题 | 检查 |
|------|------|
| Hardhat 起不来 | `docker compose logs hardhat` |
| 后端连接不上数据库 | `docker compose exec postgres pg_isready -U nfc_admin` |
| 合约调用失败 | 确认合约地址已配置到 docker-compose.yml |
| 端口不通 | 阿里云安全组 → 入方向 → 开放 8080, 8545, 5001 |
