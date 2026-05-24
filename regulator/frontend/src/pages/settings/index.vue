<template>
  <div>
    <a-page-header title="系统设置" />

    <a-card title="合约地址（Hardhat 本地链）" style="margin-bottom: 16px">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item v-for="[name, addr] in contractList" :key="name" :label="name">
          <code style="font-size: 11px; word-break: break-all;">{{ addr }}</code>
        </a-descriptions-item>
      </a-descriptions>
      <a-alert message="链 ID: 1337 | RPC: http://127.0.0.1:8545 | 7 个合约已部署" type="success" show-icon style="margin-top: 12px" />
    </a-card>

    <a-card title="服务状态" style="margin-bottom: 16px">
      <a-descriptions :column="2" bordered size="small">
        <a-descriptions-item label="前端"><a-tag color="green">运行中 :5173</a-tag></a-descriptions-item>
        <a-descriptions-item label="后端"><a-tag color="green">运行中 :8080</a-tag></a-descriptions-item>
        <a-descriptions-item label="区块链"><a-tag color="green">Hardhat :8545</a-tag></a-descriptions-item>
        <a-descriptions-item label="数据库"><a-tag color="green">PostgreSQL :5432</a-tag></a-descriptions-item>
        <a-descriptions-item label="IPFS"><a-tag color="green">:5001</a-tag></a-descriptions-item>
        <a-descriptions-item label="Redis"><a-tag color="green">:6379</a-tag></a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-card title="关于">
      <p><b>项目名称:</b> NFC 潮玩二创监管平台</p>
      <p><b>技术栈:</b> Solidity + Hardhat + Nest.js + Vue 3 + IPFS + PostgreSQL</p>
      <p><b>核心功能:</b> DID 去中心化身份 + 智能合约锁定创作规则 + NFC 防伪 + 溯源链</p>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTS } from '@/utils/chain';

const contractList = Object.entries(CONTRACTS);
</script>
