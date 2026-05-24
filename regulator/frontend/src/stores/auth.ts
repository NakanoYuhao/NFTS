import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref('');
  const address = ref('');
  const did = ref('');
  const isVerified = ref(false);

  const isLoggedIn = computed(() => !!token.value);
  const shortAddress = computed(() =>
    address.value ? `${address.value.slice(0, 6)}...${address.value.slice(-4)}` : '',
  );

  function setAuth(data: { token: string; address: string; did: string; isVerified: boolean }) {
    token.value = data.token;
    address.value = data.address;
    did.value = data.did;
    isVerified.value = data.isVerified;
  }

  function logout() {
    token.value = '';
    address.value = '';
    did.value = '';
    isVerified.value = false;
  }

  return { token, address, did, isVerified, isLoggedIn, shortAddress, setAuth, logout };
}, {
  persist: { key: 'nfc-auth' },
});
