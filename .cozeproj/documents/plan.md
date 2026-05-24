# 计划：优化钱包连接体验 — 使用 RainbowKit ConnectButton

## 概述

将 NftApplyPage 中手写的钱包连接按钮替换为 RainbowKit 官方 `ConnectButton` 组件，提供完整的钱包选择弹窗（图标、扫码、安装引导），同时补充连接错误提示和 WalletConnect projectId 配置引导。平台：web。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 钱包连接组件 | RainbowKit `ConnectButton` | 自带弹窗、钱包图标、扫码、安装引导，无需手写 |
| 状态管理 | wagmi `useAccount` + `useDisconnect` | 已在用，保持不变 |
| 链配置 | 维持现有 mainnet/sepolia/polygon/polygonMumbai | 无需改动 |
| WalletConnect projectId | 环境变量 + 降级提示 | 当前占位值无法工作，需引导用户配置 |

## 功能模块

### 1. NftApplyPage 钱包连接区改造

- 移除手动遍历 `connectors.map()` 渲染按钮的逻辑
- 引入 `ConnectButton`（来自 `@rainbow-me/rainbowkit`），用 `Custom` 模式自定义外观以匹配 DESIGN.md 配色
- 已连接状态：展示地址 + 断开按钮（保持现有 teal 色卡片风格）
- 未连接状态：渲染 `ConnectButton`，点击弹出 RainbowKit 钱包选择弹窗
- 移除独立的「创建新钱包 MetaMask」按钮（RainbowKit 弹窗已包含安装引导）
- 补充连接错误 toast 提示（用 sonner）

### 2. WalletConnect projectId 配置

- 当前 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 为占位值 `demo-project-id`
- WalletConnect V2 强制要求有效 projectId，否则无法生成扫码连接
- 在页面上检测到占位值时，显示提示信息引导用户去 WalletConnect Cloud 申请

## 是否有原型设计

是（设计引导工具已开启）

## 实施步骤

1. **阶段一：原型设计** — 加载 design-canvas 技能，设计 NftApplyPage 钱包连接区的原型页面（含 ConnectButton 弹窗样式），提示用户验收确认
2. **阶段二：修改 NftApplyPage** — 替换手写 connectors 遍历为 RainbowKit `ConnectButton` Custom 模式，自定义外观匹配 DESIGN.md 配色，补充错误提示 — `src/components/NftApplyPage.tsx`
3. **阶段二：配置 WalletConnect projectId 提示** — 检测占位值时在 UI 显示配置引导，避免用户困惑 — `src/components/NftApplyPage.tsx`
4. **阶段二：全局 RainbowKit 主题定制** — 在 Web3Provider 中配置 RainbowKit 主题色，与项目 teal/orange 配色一致 — `src/lib/web3-provider.tsx`
5. **代码检查与验证** — 静态检查 + 冒烟测试确认钱包连接弹窗正常弹出

## 页面规格

##### @nav(web-topbar)
> type: topbar
> platform: web

- @page(/) 首页

##### @page(/) 申请 NFT-ID 页

**核心职责**：引导用户连接钱包、签署原创声明、铸造 NFT
**访问路径**：从藏品详情页点击「申请 NFT-ID」进入
**布局**：顶部导航栏（返回按钮 + 标题）→ 藏品信息卡 → 步骤指示器（3步）→ 主内容区

**状态**：
- 空态（未连接钱包）：显示 ConnectButton，点击弹出钱包选择弹窗
- 已连接：显示 teal 色已连接卡片（地址 + 断开按钮）
- 加载态：连接中按钮显示 loading
- 错误态：toast 提示连接失败原因

**弹窗 wallet-connect-modal**（RainbowKit 内置）：
- 展示钱包列表（MetaMask、WalletConnect、Coinbase、Rainbow），带图标
- WalletConnect 选项点击后展示扫码二维码
- 未安装钱包时提供下载链接

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 返回按钮 | 点击 | 返回详情页 | — | — |
| ConnectButton（未连接） | 点击 | 弹出 RainbowKit 钱包选择弹窗 | — | 自定义外观匹配 teal 主题 |
| 钱包选项（弹窗内） | 点击 | 触发钱包连接流程 | connector id | RainbowKit 内置 |
| 断开连接 | 点击 | 断开钱包，回到未连接态 | — | — |
| 下一步按钮 | 点击 | 进入原创声明步骤 | — | 需钱包已连接 |
