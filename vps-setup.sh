#!/bin/bash
set -e

# =============================================================================
# NFC 二创监管平台 — VPS 一键部署脚本
# 在阿里云 ECS 上通过 Web 终端或 SSH 执行：
#   curl -fsSL https://你的文件服务器/vps-setup.sh | bash
# 或直接复制粘贴到终端
# =============================================================================

echo "============================================"
echo " NFC 二创监管平台 — VPS 部署"
echo " 目标: 8.148.177.143"
echo "============================================"

# ---- 1. 系统更新 ----
echo "[1/6] 更新系统..."
apt-get update -qq && apt-get upgrade -y -qq

# ---- 2. 安装 Docker ----
echo "[2/6] 安装 Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
fi
if ! docker compose version &>/dev/null 2>&1; then
    apt-get install -y docker-compose-plugin 2>/dev/null || \
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose
fi
echo "Docker version: $(docker --version)"

# ---- 3. 安装 Node.js (用于部署合约) ----
echo "[3/6] 安装 Node.js 20..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js version: $(node --version)"

# ---- 4. 创建项目目录 ----
echo "[4/6] 准备项目文件..."
mkdir -p /opt/nfc-platform
cd /opt/nfc-platform

# ---- 5. 写入所有项目文件 ----
echo "[5/6] 写入配置文件..."

# 合约 Solidity 文件
mkdir -p contracts
cat > contracts/OpenNFT.sol << 'CONTRACTSOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OpenNFT {
    string public name;
    string public symbol;
    uint256 private _nextTokenId;
    address public owner;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
        owner = msg.sender;
        _nextTokenId = 1;
    }

    function safeMint(address to, string memory uri) external returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to]++;
        _tokenURIs[tokenId] = uri;
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function balanceOf(address addr) external view returns (uint256) {
        require(addr != address(0), "Zero address query");
        return _balances[addr];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Token does not exist");
        return o;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Not token owner");
        require(to != address(0), "Cannot transfer to zero address");
        require(msg.sender == from || msg.sender == owner, "Not authorized");
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
CONTRACTSOL

echo "[5/6] 合约文件写入完成"

# ---- 6. 创建 Docker Compose ----
mkdir -p regulator/docker
cat > regulator/docker/docker-compose.yml << 'DOCKERCOMPOSE'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: nfc-postgres
    environment:
      POSTGRES_USER: nfc_admin
      POSTGRES_PASSWORD: nfc_platform_2024
      POSTGRES_DB: nfc_registry
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: nfc-redis
    ports:
      - "6379:6379"
    restart: unless-stopped

  ipfs:
    image: ipfs/kubo:latest
    container_name: nfc-ipfs
    ports:
      - "4001:4001"
      - "5001:5001"
      - "8081:8080"
    restart: unless-stopped
    command: daemon --enable-gc --enable-pubsub-experiment

  hardhat:
    build:
      context: /opt/nfc-platform
      dockerfile: regulator/docker/Dockerfile.hardhat
    container_name: nfc-hardhat
    ports:
      - "8545:8545"
    restart: unless-stopped

  backend:
    build:
      context: /opt/nfc-platform/regulator/backend
      dockerfile: ../docker/Dockerfile.backend.vps
    container_name: nfc-backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://nfc_admin:nfc_platform_2024@postgres:5432/nfc_registry
      - REDIS_URL=redis://redis:6379
      - CHAIN_RPC=http://hardhat:8545
      - IPFS_API=http://ipfs:5001
      - IPFS_GATEWAY=http://ipfs:8080
      - JWT_SECRET=nfc-platform-jwt-secret-prod-2024
      - FRONTEND_URL=http://localhost:5000
      - PLATFORM_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
      - PLATFORM_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    depends_on:
      - postgres
      - redis
      - ipfs
      - hardhat
    restart: unless-stopped

volumes:
  pgdata:
DOCKERCOMPOSE

echo "[6/6] Docker Compose 文件写入完成"
echo ""
echo "============================================"
echo " 文件准备完毕！"
echo "============================================"
echo ""
echo "接下来手动执行:"
echo "  cd /opt/nfc-platform/regulator/docker"
echo "  docker compose up -d"
echo ""
