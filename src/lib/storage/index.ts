// ============================================================
// 统一存储接口 — 适配器模式
// 当前使用 localStorage 本地适配器
// 接入服务端后切换为 server 适配器即可
// ============================================================

export * from './onft-format';
export * as storageLocal from './storage-local';
export * as storageServer from './storage-server';

// 当前活跃的存储模式
export type StorageMode = 'local' | 'server';

let currentMode: StorageMode = 'local';

/**
 * 获取当前存储模式
 */
export function getStorageMode(): StorageMode {
  return currentMode;
}

/**
 * 切换存储模式（接入服务端时调用）
 */
export function setStorageMode(mode: StorageMode): void {
  currentMode = mode;
}
