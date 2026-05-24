<template>
  <div>
    <a-page-header title="二创规则管理" sub-title="所有活跃的衍生品授权规则">
      <template #extra>
        <a-button @click="loadData()">刷新</a-button>
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
        <template v-if="column.key === 'royalty'">
          <span>{{ record._config?.royaltyBps ? record._config.royaltyBps / 100 : 0 }}%</span>
        </template>
        <template v-if="column.key === 'types'">
          <a-tag v-for="t in (record._config?.allowedTypes || [])" :key="t" color="blue" size="small">{{ t }}</a-tag>
        </template>
        <template v-if="column.key === 'commercial'">
          <a-tag :color="record._config?.allowCommercial ? 'green' : 'default'">
            {{ record._config?.allowCommercial ? '允许' : '禁止' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="$router.push(`/policies/editor/${record.originalTokenId}`)">
              编辑
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { policyApi } from '@/api';

const loading = ref(false);
const items = ref<any[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });

const columns = [
  { title: '原作 Token ID', dataIndex: 'originalTokenId' },
  { title: '创作者', dataIndex: 'creatorAddress', ellipsis: true },
  { title: '版税率', key: 'royalty' },
  { title: '允许类型', key: 'types' },
  { title: '商用', key: 'commercial' },
  { title: '创建时间', dataIndex: 'createdAt' },
  { title: '操作', key: 'action', width: 100 },
];

async function loadData(page = 1) {
  loading.value = true;
  try {
    const { data } = await policyApi.list({ page, pageSize: pagination.value.pageSize });
    items.value = (data.items || []).map((item: any) => ({
      ...item,
      _config: typeof item.configJson === 'string'
        ? (() => { try { return JSON.parse(item.configJson); } catch { return {}; } })()
        : (item.configJson || {}),
    }));
    pagination.value.total = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function onPageChange(pag: any) {
  loadData(pag.current);
}

onMounted(() => loadData());
</script>
