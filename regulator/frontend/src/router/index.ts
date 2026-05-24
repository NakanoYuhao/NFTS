import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/pages/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/dashboard/index.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'ip-assets',
        name: 'IpAssets',
        component: () => import('@/pages/ip-assets/list.vue'),
        meta: { title: 'IP 资产管理' },
      },
      {
        path: 'ip-assets/register',
        name: 'RegisterIp',
        component: () => import('@/pages/ip-assets/register.vue'),
        meta: { title: '注册新 IP' },
      },
      {
        path: 'ip-assets/:tokenId',
        name: 'IpAssetDetail',
        component: () => import('@/pages/ip-assets/detail.vue'),
        meta: { title: 'IP 详情' },
      },
      {
        path: 'policies',
        name: 'Policies',
        component: () => import('@/pages/policies/list.vue'),
        meta: { title: '二创规则' },
      },
      {
        path: 'policies/editor/:tokenId?',
        name: 'PolicyEditor',
        component: () => import('@/pages/policies/editor.vue'),
        meta: { title: '规则编辑器' },
      },
      {
        path: 'derivatives',
        name: 'Derivatives',
        component: () => import('@/pages/derivatives/list.vue'),
        meta: { title: '衍生品管理' },
      },
      {
        path: 'derivatives/submit/:originalTokenId?',
        name: 'SubmitDerivative',
        component: () => import('@/pages/derivatives/submit.vue'),
        meta: { title: '提交衍生品' },
      },
      {
        path: 'derivatives/:tokenId',
        name: 'DerivativeDetail',
        component: () => import('@/pages/derivatives/detail.vue'),
        meta: { title: '衍生品详情' },
      },
      {
        path: 'audit',
        name: 'Audit',
        component: () => import('@/pages/audit/index.vue'),
        meta: { title: '审计日志' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/pages/settings/index.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  // 更新页面标题
  document.title = to.meta.title
    ? `${to.meta.title} - NFC 潮玩二创监管平台`
    : 'NFC 潮玩二创监管平台';

  if (to.meta.requiresAuth && !authStore.token) {
    next({ name: 'Login' });
  } else {
    next();
  }
});

export default router;
