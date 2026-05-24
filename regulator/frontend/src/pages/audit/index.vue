<template>
  <div>
    <a-page-header title="审计日志" sub-title="所有操作链上可查、链下留痕" />

    <!-- 统计 -->
    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :span="8">
        <a-statistic title="总操作数" :value="stats.totalActions" />
      </a-col>
      <a-col :span="8">
        <a-statistic title="活跃操作者" :value="stats.uniqueOperators" />
      </a-col>
    </a-row>

    <a-card title="操作记录">
      <a-table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        @change="onPageChange"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-tag :color="actionColor(record.action)">{{ record.action }}</a-tag>
          </template>
          <template v-if="column.key === 'txHash'">
            <a v-if="record.txHash" :href="`https://explorer.example.com/tx/${record.txHash}`" target="_blank">
              {{ record.txHash.slice(0, 10) }}...
            </a>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { auditApi } from '@/api';

const loading = ref(false);
const items = ref([]);
const stats = reactive({ totalActions: 0, uniqueOperators: 0 });
const pagination = ref({ current: 1, pageSize: 50, total: 0 });

const columns = [
  { title: '操作者', dataIndex: 'operator' },
  { title: '操作', dataIndex: 'action', key: 'action' },
  { title: '目标', dataIndex: 'target', ellipsis: true },
  { title: '交易哈希', dataIndex: 'txHash', key: 'txHash' },
  { title: '时间', dataIndex: 'createdAt' },
];

function actionColor(action: string) {
  const map: Record<string, string> = {
    'SUBMIT_DERIVATIVE': 'blue',
    'FREEZE_DERIVATIVE': 'red',
    'SET_POLICY': 'purple',
    'REGISTER_DID': 'green',
    'MINT_ORIGINAL': 'cyan',
  };
  return map[action] || 'default';
}

async function loadData(page = 1) {
  loading.value = true;
  try {
    const [logRes, statRes] = await Promise.all([
      auditApi.logs({ page, pageSize: pagination.value.pageSize }),
      auditApi.stats(),
    ]);
    items.value = logRes.data.items;
    pagination.value.total = logRes.data.total;
    Object.assign(stats, statRes.data);
  } finally {
    loading.value = false;
  }
}

function onPageChange(pag: any) {
  loadData(pag.current);
}

onMounted(() => loadData());
</script>
