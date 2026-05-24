<template>
  <div class="login-bg">
    <a-card class="login-card" title="NFC 潮玩二创监管平台">
      <template #extra>
        <a-tag color="purple">区块链 + DID + 智能合约</a-tag>
      </template>

      <a-space direction="vertical" size="large" style="width: 100%">
        <!-- 步骤 1：连接钱包 -->
        <div>
          <p class="step-title">第 1 步：连接钱包</p>
          <a-button
            type="primary"
            block
            size="large"
            @click="connectWallet"
            :loading="connecting"
          >
            <template #icon><wallet-outlined /></template>
            {{ walletAddress ? `已连接: ${shortAddr}` : '连接 MetaMask' }}
          </a-button>
        </div>

        <!-- 步骤 2：签名登录 -->
        <div v-if="walletAddress">
          <p class="step-title">第 2 步：签名验证身份</p>
          <a-alert
            type="info"
            :message="signMessage"
            show-icon
            style="margin-bottom: 12px; word-break: break-all;"
          />
          <a-button
            type="primary"
            block
            size="large"
            @click="signAndLogin"
            :loading="signing"
          >
            <template #icon><safety-outlined /></template>
            签名并登录
          </a-button>
        </div>

        <!-- 登录成功 -->
        <a-result
          v-if="loginSuccess"
          status="success"
          title="登录成功"
          sub-title="正在跳转至管理控制台..."
        >
          <template #extra>
            <a-button type="primary" @click="$router.push('/dashboard')">进入控制台</a-button>
          </template>
        </a-result>
      </a-space>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ethers } from 'ethers';
import { useAuthStore } from '@/stores/auth';
import { authApi, didApi } from '@/api';
import { connectWallet as connectWalletWithSwitch } from '@/utils/chain';
import { message } from 'ant-design-vue';

const router = useRouter();
const authStore = useAuthStore();

const connecting = ref(false);
const signing = ref(false);
const walletAddress = ref('');
const signMessage = ref('');
const loginSuccess = ref(false);

const shortAddr = computed(() =>
  walletAddress.value ? `${walletAddress.value.slice(0, 6)}...${walletAddress.value.slice(-4)}` : '',
);

async function connectWallet() {
  connecting.value = true;
  try {
    // 使用 chain.ts 的统一连接方法（含自动切换 Hardhat 网络）
    const { address } = await connectWalletWithSwitch();
    walletAddress.value = address;

    // 获取登录 nonce
    const { data } = await authApi.getNonce(walletAddress.value);
    signMessage.value = data.message;
  } catch (err: any) {
    message.error(err.message || '连接钱包失败');
  } finally {
    connecting.value = false;
  }
}

async function signAndLogin() {
  signing.value = true;
  try {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(signMessage.value);

    const { data } = await authApi.login(walletAddress.value, signMessage.value, signature);
    authStore.setAuth({
      token: data.token,
      address: data.address,
      did: data.did || '',
      isVerified: data.isVerified,
    });

    // 如果没有 DID，先注册
    if (!data.did) {
      try {
        await didApi.register(data.address);
        message.info('已自动注册 DID，请等待管理员认证');
      } catch {}
    }

    loginSuccess.value = true;
    setTimeout(() => router.push('/dashboard'), 1500);
  } catch (err: any) {
    message.error(err.message || '签名失败');
  } finally {
    signing.value = false;
  }
}
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
.step-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #555;
}
</style>
