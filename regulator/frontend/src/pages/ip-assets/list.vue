<template>
  <div>
    <a-page-header title="IP 资产管理" sub-title="管理 NFC 潮玩原作">
      <template #extra>
        <a-button type="primary" @click="$router.push('/ip-assets/register')">
          <plus-outlined /> 注册新 IP
        </a-button>
      </template>
    </a-page-header>

    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="pagination"
      @change="onPageChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'tokenId'">
          <a-tag color="blue">#{{ record.tokenId }}</a-tag>
        </template>
        <template v-if="column.key === 'nfc'">
          <a-tag v-if="record.nfcChipUID" color="green">已绑定</a-tag>
          <a-tag v-else color="orange">未绑定</a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="$router.push(`/ip-assets/${record.tokenId}`)">
              详情 / 溯源
            </a-button>
            <a-button type="link" size="small" @click="$router.push(`/policies/editor/${record.tokenId}`)">
              设定规则
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ipAssetApi } from '@/api';

const loading = ref(false);
const items = ref([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });

const columns = [
  { title: 'Token ID', dataIndex: 'tokenId', key: 'tokenId' },
  { title: '创作者', dataIndex: 'creatorAddress', key: 'creator' },
  { title: 'NFC 绑定', key: 'nfc' },
  { title: '元数据 CID', dataIndex: 'metadataCid', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '创建时间', dataIndex: 'createdAt' },
  { title: '操作', key: 'action', width: 200 },
];

async function loadData(page = 1) {
  loading.value = true;
  try {
    const { data } = await ipAssetApi.list({ page, pageSize: pagination.value.pageSize });
    items.value = data.items;
    pagination.value.total = data.total;
    pagination.value.current = page;
  } finally {
    loading.value = false;
  }
}

function onPageChange(pag: any) {
  loadData(pag.current);
}

onMounted(() => loadData());
</script>
