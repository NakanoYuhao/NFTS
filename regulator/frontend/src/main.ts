import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPersistedstate from 'pinia-plugin-persistedstate';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import * as Icons from '@ant-design/icons-vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPersistedstate);

app.use(pinia);
app.use(router);
app.use(Antd);

// 全局注册所有图标（Ant Design Vue 4.x 需要单独导入）
for (const [key, component] of Object.entries(Icons)) {
  app.component(key, component);
}

app.mount('#app');
