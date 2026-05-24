<template>
  <div>
    <a-page-header title="注册新 IP" sub-title="铸造原作 NFT + 绑定 NFC 芯片（MetaMask 签名）">
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
        <a-form-item label="作品名称" required>
          <a-input v-model:value="form.name" placeholder="如：赛博龙年潮玩" :disabled="currentStep > 0" />
        </a-form-item>
        <a-form-item label="作品描述" required>
          <a-textarea v-model:value="form.description" :rows="3" :disabled="currentStep > 0" />
        </a-form-item>
        <a-form-item label="系列" required>
          <a-input v-model:value="form.series" placeholder="如：Cyber Zodiac 系列" :disabled="currentStep > 0" />
        </a-form-item>
        <a-form-item label="NFC 芯片 UID" required>
          <a-input v-model:value="form.nfcChipUID" placeholder="NTAG 424 DNA 芯片 UID" :disabled="currentStep > 0" />
        </a-form-item>

        <a-form-item v-if="currentStep === 0">
          <a-button type="primary" html-type="submit" :loading="submitting" block size="large">
            下一步：上传 IPFS
          </a-button>
        </a-form-item>
      </a-form>

      <!-- 步骤 2：IPFS 上传结果 -->
      <a-result v-if="currentStep >= 1" status="info" title="IPFS 上传完成">
        <template #subTitle>
          <p>元数据 CID: {{ metadataCid }}</p>
          <p>DID: {{ did }}</p>
        </template>
        <template #extra v-if="currentStep === 1">
          <a-button type="primary" @click="mintViaMetaMask" :loading="minting" size="large">
            <wallet-outlined /> MetaMask 铸造 NFT
          </a-button>
        </template>
      </a-result>

      <!-- 步骤 3：铸造成功 -->
      <a-result v-if="currentStep >= 2 && result" status="success" :title="`铸造成功！Token ID: #${result.tokenId}`">
        <template #subTitle>
          <p>交易哈希: {{ result.txHash }}</p>
        </template>
        <template #extra>
          <a-space>
            <a-button type="primary" @click="$router.push(`/ip-assets/${result.tokenId}`)">查看详情</a-button>
            <a-button @click="resetForm">继续注册</a-button>
          </a-space>
        </template>
      </a-result>

      <a-alert v-if="errorMsg" :message="errorMsg" type="error" show-icon style="margin-top: 16px" closable @close="errorMsg=''" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { connectWallet, registerDidOnChain, mintOriginalOnChain, generateDid, generateDidHash, toBase64 } from '@/utils/chain';
import { ipAssetApi, didApi, syncApi } from '@/api';
import { message } from 'ant-design-vue';
import { ethers } from 'ethers';

const authStore = useAuthStore();
const submitting = ref(false);
const minting = ref(false);
const currentStep = ref(0);
const result = ref<any>(null);
const errorMsg = ref('');
const metadataCid = ref('');
const did = ref('');
let didHash = '';
let didDocObj: object = {};

const form = reactive({
  name: '', description: '', series: '', nfcChipUID: '',
});

async function handleSubmit() {
  if (!form.name || !form.nfcChipUID) { message.warning('请填写必填项'); return; }
  submitting.value = true;
  errorMsg.value = '';

  try {
    // 生成 DID
    const addr = authStore.address;
    did.value = generateDid(addr);
    didDocObj = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did.value,
      verificationMethod: [{ id: `${did.value}#keys-1`, type: 'EcdsaSecp256k1VerificationKey2019', controller: did.value, publicKeyHex: addr.toLowerCase() }],
    };
    didHash = generateDidHash(didDocObj);

    // 注册 DID（后端存 DB，已注册则跳过）
    try { await didApi.register(addr); } catch (e: any) { /* 409 表示已注册，忽略 */ }

    // 上传元数据到后端（后端负责 IPFS/fallback）
    const metadataJson = {
      name: form.name, description: form.description,
      image: '', attributes: [
        { trait_type: 'Series', value: form.series },
        { trait_type: 'NFC Chip', value: form.nfcChipUID },
        { trait_type: 'Creator DID', value: did.value },
      ],
    };
    const { data } = await ipAssetApi.mint({
      creatorAddress: addr, nfcChipUID: form.nfcChipUID,
      artworkBase64: toBase64(JSON.stringify(metadataJson)),
      name: form.name, description: form.description, series: form.series,
    });
    metadataCid.value = data?.metadataCid || `local://${Date.now()}`;
    currentStep.value = 1;
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || err.message || '上传失败';
  } finally {
    submitting.value = false;
  }
}

async function mintViaMetaMask() {
  minting.value = true;
  errorMsg.value = '';
  try {
    const { signer } = await connectWallet();
    const addr = authStore.address;

    // 步骤 1：链上注册 DID
    try {
      const didResult = await registerDidOnChain(signer, addr, did.value, didHash);
      // 同步 DID 到后端
      try {
        await syncApi.did({
          address: addr, did: did.value, didHash,
          didCid: metadataCid.value, txHash: didResult.txHash,
        });
      } catch (e: any) {
        console.warn('Sync DID failed (non-blocking):', e.message);
      }
    } catch (e: any) {
      const msg = e.reason || e.message || '';
      if (msg.includes('Already registered')) {
        // DID 已在链上注册，继续
      } else {
        throw e;
      }
    }

    // 步骤 2：链上铸造原作 NFT
    const { tokenId, txHash } = await mintOriginalOnChain(
      signer, addr, metadataCid.value, form.nfcChipUID, did.value,
    );

    // 步骤 3：同步到后端数据库
    try {
      await syncApi.mint({
        creatorAddress: addr, tokenId, nfcChipUID: form.nfcChipUID,
        metadataCid: metadataCid.value, artworkCid: metadataCid.value, txHash,
      });
    } catch (e: any) {
      const detail = e.response?.data?.message || e.message || '未知错误';
      errorMsg.value = '链上铸造成功，但数据同步到服务器失败：' + detail + '。请刷新页面后查看。';
      console.error('Sync mint failed:', detail, e);
    }

    result.value = { tokenId, txHash };
    currentStep.value = 2;
    message.success('NFT 铸造成功！');
  } catch (err: any) {
    errorMsg.value = err.reason || err.message || 'MetaMask 交易失败';
  } finally {
    minting.value = false;
  }
}

function resetForm() {
  currentStep.value = 0; result.value = null;
  form.name = ''; form.description = ''; form.series = ''; form.nfcChipUID = '';
}
</script>
