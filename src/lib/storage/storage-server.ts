// ============================================================
// 服务端存储适配器 — 预留骨架，不实现
// 接入时替换 TODO 为真实 HTTP 请求
//
// v4 变更：.onft 不再包含身份 JSON
//   - 保存时需同时上传 .onft 文件和身份 JSON 文件
//   - 加载时需分别获取 .onft 和身份 JSON
// ============================================================

import { Collectible } from '@/types';

const BASE_URL = '/api/storage';

/**
 * 服务端存储适配器
 * TODO: 接入真实服务端后实现以下方法
 */
export const storageServer = {
  /**
   * 保存藏品到服务端
   * TODO: POST /api/storage/save — FormData 上传 .onft 文件 + 身份 JSON 文件
   */
  async save(_collectible: Collectible): Promise<{ id: string; url: string }> {
    throw new Error('服务端存储尚未实现');
  },

  /**
   * 从服务端加载藏品
   * TODO: GET /api/storage/load?id=xxx — 下载 .onft 文件 + 身份 JSON 并合并
   */
  async load(_id: string): Promise<Collectible> {
    throw new Error('服务端存储尚未实现');
  },

  /**
   * 列出服务端所有藏品元数据
   * TODO: GET /api/storage/list
   */
  async loadAll(): Promise<Collectible[]> {
    throw new Error('服务端存储尚未实现');
  },

  /**
   * 删除服务端藏品
   * TODO: DELETE /api/storage/delete?id=xxx
   */
  async delete(_id: string): Promise<void> {
    throw new Error('服务端存储尚未实现');
  },

  /**
   * 本地↔服务端同步
   * TODO: POST /api/storage/sync — 对比本地和服务端数据，返回差异
   */
  async sync(_localIds: string[]): Promise<{
    toUpload: string[];
    toDownload: string[];
  }> {
    throw new Error('服务端存储尚未实现');
  },
};
