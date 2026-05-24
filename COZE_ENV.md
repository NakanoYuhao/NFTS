# Coze 平台环境变量配置

在 Coze 控制台 → 项目 → 环境变量 中添加以下变量：

## 运行时环境变量（必填）

| 变量名 | 值 |
|--------|-----|
| `BACKEND_URL` | `http://8.148.177.143:8080` |
| `NEXT_PUBLIC_CHAIN_RPC_URL` | `http://8.148.177.143:8545` |
| `NEXT_PUBLIC_CHAIN_ID` | `0x539` |
| `NEXT_PUBLIC_CHAIN_NAME` | `NFC Trendy Guard Local` |
| `NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_NAME` | `ETH` |
| `NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_SYMBOL` | `ETH` |
| `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` | `0x68B1D87F95878fE05B998F19b66F4baba5De1aed` |
| `NEXT_PUBLIC_DID_METHOD` | `did:fisco:bcos` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | (待你从 cloud.walletconnect.com 获取) |

## 平台自动注入（无需手动配置）

| 变量名 | 说明 |
|--------|------|
| `COZE_PROJECT_ENV` | 运行环境 (DEV/PROD) |
| `COZE_BUCKET_ENDPOINT_URL` | S3 存储端点 |
| `COZE_BUCKET_NAME` | S3 存储桶名 |
| `COZE_PROJECT_DOMAIN_DEFAULT` | 项目域名 |

## Coze 平台说明

- 部署后项目 URL 格式: `https://{project-slug}.dev.coze.site`
- AI 功能在 Coze 上自动恢复（使用豆包大模型 + SeeDream 图片生成）
- 用户通过 MetaMask 连接 VPS 上的 Hardhat 链进行 NFT 铸造
- 二创监管平台访问: `https://{project-slug}.dev.coze.site/regulator/index.html`
