import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { message } from 'ant-design-vue';
import router from '@/router';

// API 基础路径 — 始终使用当前域名下的 /api 路径
// Next.js 服务器会将 /api/auth/* 等监管后端路由代理到 BACKEND_URL
// Vite 开发模式下通过 vite.config.ts 的 proxy 转发
const apiBase = '/api';

const api = axios.create({
  baseURL: apiBase,
  timeout: 30000,
});

// 请求拦截器：附加 JWT
api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

// 响应拦截器：错误处理
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
      router.push({ name: 'Login' });
      message.error('登录已过期，请重新登录');
    } else if (err.response?.data?.message) {
      message.error(err.response.data.message);
    } else {
      message.error('网络请求失败');
    }
    return Promise.reject(err);
  },
);

// ========== API 接口 ==========

// 认证
export const authApi = {
  getNonce: (address: string) => api.post('/auth/nonce', { address }),
  login: (address: string, message: string, signature: string) =>
    api.post('/auth/login', { address, message, signature }),
};

// DID
export const didApi = {
  register: (address: string) => api.post('/did/register', { address }),
  getCreator: (address: string) => api.get(`/did/creator/${address}`),
  resolve: (did: string) => api.get(`/did/resolve/${did}`),
};

// IP 资产
export const ipAssetApi = {
  mint: (data: any) => api.post('/ip-assets/mint', data),
  list: (params?: any) => api.get('/ip-assets', { params }),
  detail: (tokenId: number) => api.get(`/ip-assets/${tokenId}`),
  verifyNfc: (nfcChipUID: string) => api.post('/ip-assets/verify-nfc', { nfcChipUID }),
};

// 规则
export const policyApi = {
  list: (params?: any) => api.get('/policies', { params }),
  set: (data: any) => api.post('/policies', data),
  get: (tokenId: number) => api.get(`/policies/${tokenId}`),
  history: (tokenId: number) => api.get(`/policies/${tokenId}/history`),
};

// 衍生品
export const derivativeApi = {
  submit: (data: any) => api.post('/derivatives/submit', data),
  list: (params?: any) => api.get('/derivatives', { params }),
  trace: (tokenId: number) => api.get(`/derivatives/${tokenId}/trace`),
  freeze: (tokenId: number, operator: string) =>
    api.post(`/derivatives/${tokenId}/freeze`, { operator }),
};

// 审计
export const auditApi = {
  logs: (params?: any) => api.get('/audit/logs', { params }),
  stats: () => api.get('/audit/stats'),
};

// 仪表盘
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  trends: () => api.get('/dashboard/trends'),
};

// IPFS 上传
export const ipfsApi = {
  uploadJson: (data: object) => api.post('/ipfs/upload-json', data),
};

// 链上同步（前端完成 MetaMask 交易后调用）
export const syncApi = {
  did: (data: {
    address: string; did: string; didHash: string; didCid: string; txHash: string; isVerified?: boolean;
  }) => api.post('/sync/did', data),
  mint: (data: {
    creatorAddress: string; tokenId: number; nfcChipUID: string;
    metadataCid: string; artworkCid: string; txHash: string;
  }) => api.post('/sync/mint', data),
  policy: (data: {
    creatorAddress: string; originalTokenId: number; ruleHash: string;
    configJson: object; txHash: string;
  }) => api.post('/sync/policy', data),
  derivative: (data: {
    creatorAddress: string; derivativeTokenId: number; originalTokenId: number;
    derivativeType: string; metadataCid: string; artworkCid: string;
    nfcChipUID?: string; txHash: string;
  }) => api.post('/sync/derivative', data),
};

export default api;
