<template>
  <a-layout style="min-height: 100vh">
    <!-- 侧边栏 -->
    <a-layout-sider v-model:collapsed="collapsed" collapsible theme="dark">
      <div class="logo">
        <span v-if="!collapsed">🛡️ NFC 二创监管</span>
        <span v-else>🛡️</span>
      </div>
      <a-menu
        theme="dark"
        mode="inline"
        :selected-keys="[currentRoute]"
        @click="onMenuClick"
      >
        <a-menu-item key="dashboard">
          <dashboard-outlined /><span>仪表盘</span>
        </a-menu-item>
        <a-menu-item key="ip-assets">
          <picture-outlined /><span>IP 资产管理</span>
        </a-menu-item>
        <a-menu-item key="policies">
          <file-protect-outlined /><span>二创规则</span>
        </a-menu-item>
        <a-menu-item key="derivatives">
          <experiment-outlined /><span>衍生品管理</span>
        </a-menu-item>
        <a-menu-item key="audit">
          <audit-outlined /><span>审计日志</span>
        </a-menu-item>
        <a-menu-item key="settings">
          <setting-outlined /><span>系统设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout>
      <a-layout-header class="header">
        <div class="header-right">
          <a-space>
            <a-tag v-if="authStore.did" color="blue">
              DID: {{ authStore.did.slice(-20) }}...
            </a-tag>
            <a-tag v-if="authStore.isVerified" color="green">已认证</a-tag>
            <span>{{ authStore.shortAddress }}</span>
            <a-button type="link" @click="logout">退出</a-button>
          </a-space>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const collapsed = ref(false);

const currentRoute = computed(() => {
  const path = route.path.split('/')[1];
  return path || 'dashboard';
});

function onMenuClick({ key }: { key: string }) {
  router.push({ name: key === 'ip-assets' ? 'IpAssets' :
                        key === 'policies' ? 'Policies' :
                        key === 'derivatives' ? 'Derivatives' :
                        key === 'audit' ? 'Audit' :
                        key === 'settings' ? 'Settings' :
                        'Dashboard' });
}

function logout() {
  authStore.logout();
  router.push({ name: 'Login' });
}
</script>

<style scoped>
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
}
.header {
  background: #fff;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.content {
  margin: 24px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  min-height: 280px;
}
</style>
