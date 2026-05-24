<template>
  <div>
    <a-page-header title="编辑二创规则" sub-title="设定后上链存证，不可篡改">
      <template #extra>
        <a-button @click="$router.back()">返回</a-button>
      </template>
    </a-page-header>

    <a-card style="max-width: 720px; margin: 0 auto;">
      <a-alert
        message="上链存证提示"
        description="规则一旦写入区块链将无法删除，只能更新覆盖。请仔细确认参数。"
        type="warning"
        show-icon
        style="margin-bottom: 24px"
      />

      <a-form :model="form" layout="vertical" @finish="showConfirmModal">
        <!-- 原作 ID（从路由读取） -->
        <a-form-item label="原作 Token ID" v-if="originalTokenId != null">
          <a-tag color="blue">#{{ originalTokenId }}</a-tag>
        </a-form-item>
        <a-form-item label="原作 Token ID" v-else required>
          <a-input-number v-model:value="form.originalTokenId" :min="0" placeholder="输入原作 Token ID" style="width: 100%" />
        </a-form-item>

        <!-- 是否允许二创 -->
        <a-form-item label="是否允许二创">
          <a-switch v-model:checked="form.allowsDerivative" />
          <span style="margin-left: 8px; color: #999;">
            {{ form.allowsDerivative ? '创作者可申请二创授权' : '禁止一切二创行为' }}
          </span>
        </a-form-item>

        <template v-if="form.allowsDerivative">
          <!-- 允许的二创类型 -->
          <a-form-item label="允许的二创类型">
            <a-checkbox-group v-model:value="form.allowedTypes">
              <a-row :gutter="[16, 8]">
                <a-col :span="6"><a-checkbox value="remix">混音/混剪</a-checkbox></a-col>
                <a-col :span="6"><a-checkbox value="recolor">重新配色</a-checkbox></a-col>
                <a-col :span="6"><a-checkbox value="adaptation">改编</a-checkbox></a-col>
                <a-col :span="6"><a-checkbox value="spinoff">外传/番外</a-checkbox></a-col>
              </a-row>
            </a-checkbox-group>
          </a-form-item>

          <!-- 版税率 -->
          <a-form-item label="版税率">
            <a-row :gutter="16">
              <a-col :span="20">
                <a-slider v-model:value="form.royaltyBps" :min="0" :max="3000" :step="100" />
              </a-col>
              <a-col :span="4">
                <a-input-number v-model:value="form.royaltyBps" :min="0" :max="3000" :step="100"
                  :formatter="(v: number) => `${(v / 100).toFixed(0)}%`"
                  :parser="(s: string) => Number(s.replace('%', '')) * 100"
                  style="width: 100%" />
              </a-col>
            </a-row>
            <div style="color: #999; font-size: 12px;">
              二创作者每卖出一件衍生品，需支付的版税比例
            </div>
          </a-form-item>

          <!-- 最大发行量 -->
          <a-form-item label="衍生物最大发行量">
            <a-input-number v-model:value="form.maxSupply" :min="1" :max="10000" style="width: 200px" />
            <span style="margin-left: 8px; color: #999;">件</span>
          </a-form-item>

          <!-- 强制 NFC -->
          <a-form-item label="强制 NFC 绑定">
            <a-switch v-model:checked="form.requireNfc" />
            <span style="margin-left: 8px; color: #999;">
              开启后，衍生品必须绑定 NFC 芯片才能上链
            </span>
          </a-form-item>

          <!-- 商用许可 -->
          <a-form-item label="允许商用">
            <a-switch v-model:checked="form.allowCommercial" />
          </a-form-item>

          <!-- 有效期 -->
          <a-form-item label="授权有效期">
            <a-date-picker v-model:value="form.expireDate" style="width: 100%"
              :disabled-date="(d: any) => d.isBefore(dayjs(), 'day')" />
          </a-form-item>
        </template>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="submitting" block size="large">
            <file-protect-outlined /> 确认并上链
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 上链确认弹窗 -->
    <a-modal v-model:open="confirmVisible" title="确认上链操作" @ok="submitPolicy" :confirmLoading="submitting">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="允许二创">{{ form.allowsDerivative ? '是' : '否' }}</a-descriptions-item>
        <a-descriptions-item label="允许类型">{{ form.allowedTypes.join(', ') || '无' }}</a-descriptions-item>
        <a-descriptions-item label="版税率">{{ (form.royaltyBps / 100).toFixed(0) }}%</a-descriptions-item>
        <a-descriptions-item label="最大发行">{{ form.maxSupply }} 件</a-descriptions-item>
        <a-descriptions-item label="强制 NFC">{{ form.requireNfc ? '是' : '否' }}</a-descriptions-item>
        <a-descriptions-item label="商用">{{ form.allowCommercial ? '允许' : '禁止' }}</a-descriptions-item>
      </a-descriptions>
      <a-alert message="此操作将消耗 Gas 费用，上链后规则不可删除。" type="warning" show-icon style="margin-top: 12px" />
    </a-modal>

    <a-result
      v-if="result"
      status="success"
      title="规则已上链"
      :sub-title="`交易哈希: ${result.txHash}`"
    >
      <template #extra>
        <a-button type="primary" @click="$router.back()">返回</a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { syncApi } from '@/api';
import { connectWallet, setPolicyOnChain } from '@/utils/chain';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

const route = useRoute();
const authStore = useAuthStore();
const submitting = ref(false);
const confirmVisible = ref(false);
const result = ref<any>(null);
const errorMsg = ref('');
const originalTokenId = ref<number | null>(null);

const form = reactive({
  originalTokenId: null as number | null,
  allowsDerivative: true,
  allowedTypes: ['remix', 'recolor'] as string[],
  royaltyBps: 500,
  maxSupply: 100,
  requireNfc: false,
  allowCommercial: false,
  expireDate: null as any,
});

onMounted(() => {
  const tid = route.params.tokenId;
  if (tid !== undefined) {
    originalTokenId.value = Number(tid);
    form.originalTokenId = Number(tid);
  }
});

function showConfirmModal() {
  const tokenId = originalTokenId.value ?? form.originalTokenId;
  if (tokenId == null) {
    message.warning('请输入原作 Token ID'); return;
  }
  if (form.allowsDerivative) {
    if (form.allowedTypes.length === 0) { message.warning('请至少选择一种允许的二创类型'); return; }
    if (!form.expireDate) { message.warning('请选择有效期'); return; }
  }
  confirmVisible.value = true;
}

async function submitPolicy() {
  submitting.value = true;
  errorMsg.value = '';
  try {
    // 1. 连接 MetaMask
    const { signer } = await connectWallet();

    // 2. 链上设定规则（MetaMask 签名）
    // 日期选择器返回当天 00:00:00，需要设为当天 23:59:59 避免"已过期"
    const expireTimestamp = form.expireDate
      ? Math.floor(form.expireDate.endOf('day').valueOf() / 1000)
      : Math.floor(dayjs().add(1, 'year').endOf('day').valueOf() / 1000);

    const tokenId = originalTokenId.value ?? form.originalTokenId!;

    const { ruleHash, txHash } = await setPolicyOnChain(
      signer, authStore.address, tokenId,
      form.allowedTypes, form.royaltyBps, form.maxSupply,
      form.requireNfc, expireTimestamp, form.allowCommercial,
    );

    // 3. 同步到后端数据库
    try {
      await syncApi.policy({
        creatorAddress: authStore.address,
        originalTokenId: tokenId,
        ruleHash,
        configJson: {
          allowsDerivative: form.allowsDerivative,
          allowedTypes: form.allowedTypes,
          royaltyBps: form.royaltyBps,
          maxSupply: form.maxSupply,
          requireNfc: form.requireNfc,
          expireTimestamp,
          allowCommercial: form.allowCommercial,
        },
        txHash,
      });
    } catch (e: any) {
      console.warn('Sync policy failed (non-blocking):', e.message);
    }

    result.value = { txHash, ruleHash };
    confirmVisible.value = false;
    message.success('规则已上链存证！');
  } catch (err: any) {
    const msg = err.reason || err.response?.data?.message || err.message || '上链失败';
    if (msg.includes('Not the owner')) {
      message.error('只有原作持有者才能设定规则，请确认钱包地址与持有者一致');
    } else {
      message.error(msg);
    }
  } finally {
    submitting.value = false;
  }
}
</script>
