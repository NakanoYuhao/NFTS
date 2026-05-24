<template>
  <div>
    <a-page-header :title="`衍生品溯源 #${tokenId}`" @back="() => $router.back()" />

    <a-spin :spinning="loading">
      <template v-if="trace">
        <!-- 溯源链可视化（核心功能） -->
        <a-card title="完整溯源链" style="margin-bottom: 16px">
          <a-timeline mode="alternate">
            <!-- 节点 1：原创作者 DID -->
            <a-timeline-item color="green">
              <template #dot><safety-outlined /></template>
              <a-card size="small" title="① 原创作者 DID 注册">
                <p><b>DID:</b> {{ trace.original?.creatorDid || '未知' }}</p>
                <p><b>地址:</b> {{ trace.original?.creatorAddress }}</p>
                <a-tag color="blue">链上存证 ✓</a-tag>
              </a-card>
            </a-timeline-item>

            <!-- 节点 2：原作铸造 -->
            <a-timeline-item color="green">
              <template #dot><picture-outlined /></template>
              <a-card size="small" title="② 原作铸造 + NFC 绑定">
                <p><b>Token ID:</b> #{{ trace.original?.tokenId }}</p>
                <p><b>NFC 芯片:</b> {{ trace.original?.nfcChipUID || '未绑定' }}</p>
                <p>
                  <b>元数据:</b>
                  <a :href="trace.original?.metadataUrl" target="_blank">IPFS 查看</a>
                </p>
                <a-tag color="blue">链上存证 ✓</a-tag>
              </a-card>
            </a-timeline-item>

            <!-- 节点 3：二创规则设定 -->
            <a-timeline-item color="green">
              <template #dot><file-protect-outlined /></template>
              <a-card size="small" title="③ 二创规则上链">
                <p><b>版税率:</b> {{ (trace.policy?.royaltyBps || 0) / 100 }}%</p>
                <p><b>商用许可:</b> {{ trace.policy?.allowCommercial ? '允许' : '禁止' }}</p>
                <a-tag color="blue">链上存证 ✓</a-tag>
              </a-card>
            </a-timeline-item>

            <!-- 节点 4：衍生品铸造 -->
            <a-timeline-item :color="trace.chainVerified ? 'green' : 'red'">
              <template #dot><experiment-outlined /></template>
              <a-card size="small" title="④ 衍生作品铸造">
                <p><b>衍生 Token ID:</b> #{{ trace.derivative?.tokenId }}</p>
                <p><b>二创类型:</b> {{ trace.derivative?.derivativeType }}</p>
                <p><b>创作者:</b> {{ trace.derivative?.creatorAddress }}</p>
                <p><b>许可 ID:</b> {{ trace.licenseId }}</p>
                <p>
                  <b>衍生作品:</b>
                  <a :href="trace.derivative?.metadataUrl" target="_blank">IPFS 查看</a>
                </p>
                <a-tag v-if="trace.chainVerified" color="blue">授权有效 ✓</a-tag>
                <a-tag v-else color="red">已冻结 ✗</a-tag>
              </a-card>
            </a-timeline-item>

            <!-- 节点 5：版税分配（如适用） -->
            <a-timeline-item v-if="trace.policy?.royaltyBps > 0" color="blue">
              <template #dot><dollar-outlined /></template>
              <a-card size="small" title="⑤ 版税自动分配">
                <p>衍生物交易产生的版税按 <b>{{ (trace.policy?.royaltyBps || 0) / 100 }}%</b> 自动分配给原创作者</p>
                <a-tag color="blue">智能合约自动执行 ✓</a-tag>
              </a-card>
            </a-timeline-item>
          </a-timeline>
        </a-card>

        <!-- 监管操作 -->
        <a-card title="监管操作" v-if="trace.chainVerified">
          <a-space>
            <a-button danger @click="handleFreeze" :loading="freezing">
              <stop-outlined /> 冻结此衍生品
            </a-button>
          </a-space>
        </a-card>
      </template>

      <a-empty v-if="!trace && !loading" description="未找到溯源信息" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { derivativeApi } from '@/api';
import { message, Modal } from 'ant-design-vue';

const route = useRoute();
const authStore = useAuthStore();
const tokenId = Number(route.params.tokenId);
const loading = ref(false);
const freezing = ref(false);
const trace = ref<any>(null);

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await derivativeApi.trace(tokenId);
    trace.value = data;
  } catch (err) {
    message.error('获取溯源信息失败');
  } finally {
    loading.value = false;
  }
});

async function handleFreeze() {
  Modal.confirm({
    title: '确认冻结',
    content: '冻结后该衍生品的授权将失效，此操作不可逆。',
    okText: '确认冻结',
    okType: 'danger',
    async onOk() {
      freezing.value = true;
      try {
        await derivativeApi.freeze(tokenId, authStore.address);
        message.success('已冻结');
        // 重新加载
        const { data } = await derivativeApi.trace(tokenId);
        trace.value = data;
      } catch {} finally {
        freezing.value = false;
      }
    },
  });
}
</script>
