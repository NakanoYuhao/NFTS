<template>
  <div>
    <a-page-header :title="`原作 #${tokenId}`" @back="() => $router.back()" />

    <a-spin :spinning="loading">
      <a-descriptions v-if="detail" :column="2" bordered size="small" title="基本信息">
        <a-descriptions-item label="Token ID">#{{ detail.tokenId }}</a-descriptions-item>
        <a-descriptions-item label="创作者">{{ detail.creatorAddress }}</a-descriptions-item>
        <a-descriptions-item label="NFC 芯片 UID">{{ detail.nfcChipUID || '未绑定' }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="detail.status === 'MINTED' ? 'green' : 'red'">{{ detail.status }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="交易哈希" :span="2">
          <a :href="`https://explorer.example.com/tx/${detail.txHash}`" target="_blank">{{ detail.txHash }}</a>
        </a-descriptions-item>
        <a-descriptions-item label="元数据 IPFS">
          <a :href="detail.metadataUrl" target="_blank">查看</a>
        </a-descriptions-item>
        <a-descriptions-item label="原图 IPFS">
          <a :href="detail.artworkUrl" target="_blank">查看</a>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 当前二创规则 -->
      <a-card title="当前二创规则" style="margin-top: 16px" v-if="detail?.policy">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="是否允许二创">
            <a-tag :color="detail.policy.allowsDerivative ? 'green' : 'red'">
              {{ detail.policy.allowsDerivative ? '允许' : '禁止' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="版税率">{{ detail.policy.royaltyBps / 100 }}%</a-descriptions-item>
          <a-descriptions-item label="最大衍生数">{{ detail.policy.currentSupply }} / {{ detail.policy.maxSupply }}</a-descriptions-item>
          <a-descriptions-item label="强制 NFC">{{ detail.policy.requireNfc ? '是' : '否' }}</a-descriptions-item>
          <a-descriptions-item label="商用许可">{{ detail.policy.allowCommercial ? '允许' : '禁止' }}</a-descriptions-item>
          <a-descriptions-item label="有效期至">{{ detail.policy.expireTime }}</a-descriptions-item>
        </a-descriptions>
      </a-card>
      <a-card v-else-if="detail" title="当前二创规则" style="margin-top: 16px">
        <a-empty description="尚未设定二创规则">
          <a-space>
            <a-button type="primary" @click="$router.push(`/policies/editor/${tokenId}`)">设定规则</a-button>
            <a-button @click="$router.push(`/derivatives/submit/${tokenId}`)">提交衍生品</a-button>
          </a-space>
        </a-empty>
      </a-card>
      <!-- 操作按钮 -->
      <div style="margin-top: 16px; text-align: right;" v-if="detail">
        <a-space>
          <a-button type="primary" @click="$router.push(`/policies/editor/${tokenId}`)">
            <file-protect-outlined /> 设定二创规则
          </a-button>
          <a-button @click="$router.push(`/derivatives/submit/${tokenId}`)">
            <plus-outlined /> 提交衍生品
          </a-button>
        </a-space>
      </div>

      <!-- 衍生品列表 -->
      <a-card v-if="detail" title="关联衍生作品" style="margin-top: 16px">
        <a-table
          :columns="derivColumns"
          :data-source="detail.derivatives || []"
          :pagination="false"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <a-button type="link" size="small" @click="$router.push(`/derivatives/${record.tokenId}`)">
                溯源链
              </a-button>
            </template>
          </template>
        </a-table>
        <a-empty v-if="!detail.derivatives?.length" description="暂无衍生作品" />
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ipAssetApi } from '@/api';

const route = useRoute();
const tokenId = Number(route.params.tokenId);
const loading = ref(false);
const detail = ref<any>(null);

const derivColumns = [
  { title: 'Token ID', dataIndex: 'tokenId' },
  { title: '创作者', dataIndex: 'creatorAddress' },
  { title: '类型', dataIndex: 'derivativeType' },
  { title: '状态', dataIndex: 'status' },
  { title: '时间', dataIndex: 'createdAt' },
  { title: '操作', key: 'action' },
];

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await ipAssetApi.detail(tokenId);
    detail.value = data;
  } finally {
    loading.value = false;
  }
});
</script>
