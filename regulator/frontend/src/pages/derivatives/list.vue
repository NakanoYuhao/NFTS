<template>
  <div>
    <a-page-header title="衍生品管理" sub-title="所有二创衍生作品">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="$router.push('/derivatives/submit')">
            <plus-outlined /> 提交衍生品
          </a-button>
          <a-select v-model:value="filterStatus" placeholder="状态筛选" allowClear style="width: 120px"
            @change="loadData()">
            <a-select-option value="MINTED">已上链</a-select-option>
            <a-select-option value="FROZEN">已冻结</a-select-option>
          </a-select>
          <a-button @click="loadData()">刷新</a-button>
        </a-space>
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
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'MINTED' ? 'green' : 'red'">
            {{ record.status === 'MINTED' ? '正常' : '已冻结' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="$router.push(`/derivatives/${record.tokenId}`)">
              溯源链
            </a-button>
            <a-button v-if="record.status === 'MINTED'" type="link" danger size="small"
              @click="freezeDerivative(record.tokenId)">
              冻结
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { derivativeApi } from '@/api';
import { message, Modal } from 'ant-design-vue';

const authStore = useAuthStore();
const loading = ref(false);
const items = ref([]);
const filterStatus = ref<string | undefined>(undefined);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });

const columns = [
  { title: 'Token ID', dataIndex: 'tokenId' },
  { title: '原作 ID', dataIndex: 'originalTokenId' },
  { title: '创作者', dataIndex: 'creatorAddress' },
  { title: '类型', dataIndex: 'derivativeType' },
  { title: '状态', key: 'status' },
  { title: '时间', dataIndex: 'createdAt' },
  { title: '操作', key: 'action', width: 200 },
];

async function loadData(page = 1) {
  loading.value = true;
  try {
    const params: any = { page, pageSize: pagination.value.pageSize };
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await derivativeApi.list(params);
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

async function freezeDerivative(tokenId: number) {
  Modal.confirm({
    title: '确认冻结',
    content: `确定要冻结衍生品 #${tokenId} 吗？此操作将在链上执行。`,
    okText: '确认冻结',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await derivativeApi.freeze(tokenId, authStore.address);
        message.success('冻结成功');
        loadData();
      } catch {}
    },
  });
}

onMounted(() => loadData());
</script>
