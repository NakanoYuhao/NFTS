<template>
  <div>
    <a-page-header title="提交二创衍生品" sub-title="基于已授权原作铸造衍生 NFT（MetaMask 签名）">
      <template #extra>
        <a-button @click="$router.back()">返回</a-button>
      </template>
    </a-page-header>

    <a-card style="max-width: 720px; margin: 0 auto;">
      <!-- 步骤提示 -->
      <a-steps :current="currentStep" size="small" style="margin-bottom: 24px">
        <a-step title="填写信息" />
        <a-step title="上传 IPFS" />
        <a-step title="MetaMask 铸造" />
      </a-steps>

      <a-form :model="form" layout="vertical" @finish="handleSubmit">
        <!-- 原作 Token ID -->
        <a-form-item label="原作 Token ID" v-if="originalTokenId != null">
          <a-tag color="blue">#{{ originalTokenId }}</a-tag>
        </a-form-item>
        <a-form-item label="原作 Token ID" v-else required>
          <a-input-number v-model:value="form.originalTokenId" :min="0" placeholder="输入原作 Token ID" style="width: 100%" :disabled="currentStep > 0" />
        </a-form-item>

        <!-- 二创类型 -->
        <a-form-item label="二创类型" required>
          <a-radio-group v-model:value="form.derivativeType" :disabled="currentStep > 0">
            <a-radio-button value="remix">混音/混剪</a-radio-button>
            <a-radio-button value="recolor">重新配色</a-radio-button>
            <a-radio-button value="adaptation">改编</a-radio-button>
            <a-radio-button value="spinoff">外传/番外</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <!-- 作品名称 -->
        <a-form-item label="衍生作品名称" required>
          <a-input v-model:value="form.title" placeholder="如：龙年潮玩·暗夜版" :disabled="currentStep > 0" />
        </a-form-item>

        <!-- 作品描述 -->
        <a-form-item label="作品描述" required>
          <a-textarea v-model:value="form.description" :rows="3" :disabled="currentStep > 0" />
        </a-form-item>

        <!-- NFC 芯片（可选） -->
        <a-form-item label="NFC 芯片 UID（选填）">
          <a-input v-model:value="form.nfcChipUID" placeholder="衍生品的 NFC 芯片 UID" :disabled="currentStep > 0" />
        </a-form-item>

        <a-form-item v-if="currentStep === 0">
          <a-button type="primary" html-type="submit" :loading="submitting" block size="large">
            下一步：上传 IPFS
          </a-button>
        </a-form-item>
      </a-form>

      <!-- 步骤 2：准备完成 -->
      <a-result v-if="currentStep >= 1" status="info" title="准备就绪">
        <template #subTitle>
          <p>元数据 CID: {{ metadataCid }}</p>
          <p>原作 Token: #{{ originalTokenId ?? form.originalTokenId }}</p>
          <p>二创类型: {{ form.derivativeType }}</p>
        </template>
        <template #extra v-if="currentStep === 1">
          <a-button type="primary" @click="submitViaMetaMask" :loading="minting" size="large">
            <wallet-outlined /> MetaMask 提交衍生品
          </a-button>
        </template>
      </a-result>

      <!-- 步骤 3：成功 -->
      <a-result v-if="currentStep >= 2 && result" status="success" :title="`提交成功！衍生品 Token ID: #${result.derivativeTokenId}`">
        <template #subTitle>
          <p>交易哈希: {{ result.txHash }}</p>
        </template>
        <template #extra>
          <a-space>
            <a-button type="primary" @click="$router.push(`/derivatives/${result.derivativeTokenId}`)">查看溯源链</a-button>
            <a-button @click="resetForm">继续提交</a-button>
          </a-space>
        </template>
      </a-result>

      <a-alert v-if="errorMsg" :message="errorMsg" type="error" show-icon style="margin-top: 16px" closable @close="errorMsg=''" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { syncApi, ipAssetApi } from '@/api';
import { connectWallet, submitDerivativeOnChain, toBase64 } from '@/utils/chain';
import { message } from 'ant-design-vue';

const route = useRoute();
const authStore = useAuthStore();
const submitting = ref(false);
const minting = ref(false);
const currentStep = ref(0);
const result = ref<any>(null);
const errorMsg = ref('');
const metadataCid = ref('');
const originalTokenId = ref<number | null>(null);

const form = reactive({
  originalTokenId: null as number | null,
  derivativeType: 'remix',
  title: '',
  description: '',
  nfcChipUID: '',
});

onMounted(() => {
  const tid = route.params.originalTokenId;
  if (tid !== undefined) {
    originalTokenId.value = Number(tid);
    form.originalTokenId = Number(tid);
  }
});

async function handleSubmit() {
  const tokenId = originalTokenId.value ?? form.originalTokenId;
  if (tokenId == null) { message.warning('请输入原作 Token ID'); return; }
  if (!form.title) { message.warning('请输入作品名称'); return; }
  submitting.value = true;
  errorMsg.value = '';

  try {
    // 上传元数据到后端（后端处理 IPFS/fallback）
    const metadataJson = {
      name: form.title,
      description: form.description,
      image: '',
      attributes: [
        { trait_type: 'Type', value: 'Derivative' },
        { trait_type: 'Original Token ID', value: tokenId },
        { trait_type: 'Derivative Type', value: form.derivativeType },
        { trait_type: 'Creator Address', value: authStore.address },
      ],
      created_at: new Date().toISOString(),
    };

    const { data } = await ipAssetApi.mint({
      creatorAddress: authStore.address,
      nfcChipUID: form.nfcChipUID || `derivative-${Date.now()}`,
      artworkBase64: toBase64(JSON.stringify(metadataJson)),
      name: form.title,
      description: form.description,
      series: `衍生自 #${tokenId}`,
    });

    metadataCid.value = data?.metadataCid || `local://${Date.now()}`;
    currentStep.value = 1;
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || err.message || '准备失败';
  } finally {
    submitting.value = false;
  }
}

async function submitViaMetaMask() {
  minting.value = true;
  errorMsg.value = '';
  try {
    const { signer } = await connectWallet();
    const tokenId = originalTokenId.value ?? form.originalTokenId!;

    const { derivativeTokenId, txHash } = await submitDerivativeOnChain(
      signer, authStore.address, tokenId,
      form.derivativeType, metadataCid.value, form.nfcChipUID,
    );

    // 同步到后端数据库
    try {
      await syncApi.derivative({
        creatorAddress: authStore.address,
        derivativeTokenId,
        originalTokenId: tokenId,
        derivativeType: form.derivativeType,
        metadataCid: metadataCid.value,
        artworkCid: metadataCid.value,
        nfcChipUID: form.nfcChipUID || undefined,
        txHash,
      });
    } catch (e: any) {
      const detail = e.response?.data?.message || e.message || '未知错误';
      errorMsg.value = '链上提交成功，但数据同步到服务器失败：' + detail + '。请刷新页面后查看。';
      console.error('Sync derivative failed:', detail, e);
    }

    result.value = { derivativeTokenId, txHash };
    currentStep.value = 2;
    message.success('衍生品提交成功！');
  } catch (err: any) {
    const msg = err.reason || err.message || 'MetaMask 交易失败';
    if (msg.includes('derivatives not allowed')) {
      errorMsg.value = '该原作未开放二创授权，请联系原创作者';
    } else if (msg.includes('supply reached')) {
      errorMsg.value = '该原作的衍生品发行量已达上限';
    } else if (msg.includes('policy expired')) {
      errorMsg.value = '该原作的二创授权已过期';
    } else if (msg.includes('type forbidden')) {
      errorMsg.value = '该二创类型不被原作允许';
    } else {
      errorMsg.value = msg;
    }
  } finally {
    minting.value = false;
  }
}

function resetForm() {
  currentStep.value = 0;
  result.value = null;
  form.title = '';
  form.description = '';
  form.nfcChipUID = '';
  form.derivativeType = 'remix';
  if (originalTokenId.value == null) form.originalTokenId = null;
}
</script>
