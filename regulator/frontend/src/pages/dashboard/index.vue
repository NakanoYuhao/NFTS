<template>
  <div>
    <a-page-header title="仪表盘" sub-title="平台数据概览" />

    <!-- 统计卡片 -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="4">
        <a-card size="small">
          <a-statistic title="已认证创作者" :value="overview.totalCreators" suffix=" 人">
            <template #prefix><team-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card size="small">
          <a-statistic title="原作 IP" :value="overview.totalOriginals" suffix=" 件">
            <template #prefix><picture-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card size="small">
          <a-statistic title="衍生作品" :value="overview.totalDerivatives" suffix=" 件">
            <template #prefix><experiment-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card size="small">
          <a-statistic title="活跃规则" :value="overview.totalPolicies" suffix=" 条">
            <template #prefix><file-protect-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card size="small">
          <a-statistic title="冻结作品" :value="overview.frozenCount" suffix=" 件"
            :value-style="{ color: overview.frozenCount > 0 ? '#cf1322' : '#3f8600' }">
            <template #prefix><stop-outlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 近 7 天趋势 -->
    <a-card title="近 7 天趋势" style="margin-bottom: 24px">
      <a-table
        v-if="trends.length"
        :columns="trendColumns"
        :data-source="trends"
        :pagination="false"
        row-key="date"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'originals'">
            <div style="display: flex; align-items: center; gap: 8px">
              <div :style="{
                height: '16px', background: '#1890ff', borderRadius: '2px',
                width: Math.max(4, record.originals / maxTrend * 100) + '%',
                minWidth: record.originals > 0 ? '12px' : '0'
              }" />
              <span>{{ record.originals }}</span>
            </div>
          </template>
          <template v-if="column.key === 'derivatives'">
            <div style="display: flex; align-items: center; gap: 8px">
              <div :style="{
                height: '16px', background: '#52c41a', borderRadius: '2px',
                width: Math.max(4, record.derivatives / maxTrend * 100) + '%',
                minWidth: record.derivatives > 0 ? '12px' : '0'
              }" />
              <span>{{ record.derivatives }}</span>
            </div>
          </template>
        </template>
      </a-table>
      <a-empty v-else description="暂无数据" />
    </a-card>

    <!-- 最近衍生品 -->
    <a-card title="最近衍生作品">
      <a-table
        :columns="derivativeColumns"
        :data-source="overview.recentDerivatives"
        :pagination="false"
        row-key="tokenId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="$router.push(`/derivatives/${record.tokenId}`)">
              查看溯源
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { dashboardApi } from '@/api';

const overview = reactive({
  totalCreators: 0,
  totalOriginals: 0,
  totalDerivatives: 0,
  totalPolicies: 0,
  frozenCount: 0,
  recentDerivatives: [],
});

const trends = ref<any[]>([]);

const maxTrend = computed(() => {
  if (!trends.value.length) return 1;
  return Math.max(
    ...trends.value.map((t: any) => Math.max(t.originals || 0, t.derivatives || 0)),
    1,
  );
});

const derivativeColumns = [
  { title: 'Token ID', dataIndex: 'tokenId', key: 'tokenId' },
  { title: '创作者', dataIndex: 'creatorAddress', key: 'creator' },
  { title: '类型', dataIndex: 'derivativeType', key: 'type' },
  { title: '时间', dataIndex: 'createdAt', key: 'time' },
  { title: '操作', key: 'action' },
];

const trendColumns = [
  { title: '日期', dataIndex: 'date', width: 100 },
  { title: '新增原作', key: 'originals' },
  { title: '新增衍生品', key: 'derivatives' },
];

onMounted(async () => {
  try {
    const { data } = await dashboardApi.overview();
    Object.assign(overview, data);
  } catch {
    // 加载失败
  }

  try {
    const { data } = await dashboardApi.trends();
    trends.value = data || [];
  } catch {
    trends.value = [];
  }
});
</script>
