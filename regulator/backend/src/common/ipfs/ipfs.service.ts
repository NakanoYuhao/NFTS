import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create } from 'kubo-rpc-client';

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private client: any = null;
  private gatewayUrl: string;

  constructor(private configService: ConfigService) {
    this.gatewayUrl = this.configService.get<string>('IPFS_GATEWAY', 'http://localhost:8080');
    this.initClient();
  }

  private initClient() {
    try {
      const apiUrl = this.configService.get<string>('IPFS_API', 'http://localhost:5001');
      this.client = create({ url: apiUrl });
      this.logger.log(`IPFS client connected: ${apiUrl}`);
    } catch (err) {
      this.logger.warn('IPFS not available, using passthrough mode');
    }
  }

  /// 上传 JSON 数据到 IPFS
  async uploadJson(data: string): Promise<string> {
    if (!this.client) {
      return this.localStore(data);
    }
    try {
      const result = await this.client.add(data);
      const cid = result.cid.toString();
      this.logger.log(`Uploaded JSON: ${cid}`);
      return cid;
    } catch (err) {
      this.logger.warn(`IPFS upload failed, fallback to local: ${err}`);
      return this.localStore(data);
    }
  }

  /// 上传文件到 IPFS（接收 Buffer）
  async uploadFile(file: Buffer): Promise<string> {
    if (!this.client) {
      return `local://file_${Date.now()}`;
    }
    try {
      const result = await this.client.add(file);
      const cid = result.cid.toString();
      this.logger.log(`Uploaded file: ${cid}`);
      return cid;
    } catch (err) {
      this.logger.warn(`IPFS upload failed, fallback to local`);
      return `local://file_${Date.now()}`;
    }
  }

  private localStore(data: string): string {
    return `local://did_${Date.now()}`;
  }

  /// 从 IPFS 获取内容
  async fetchJson(cid: string): Promise<any> {
    if (cid.startsWith('local://')) {
      this.logger.warn('Local storage, cannot fetch');
      return null;
    }

    if (!this.client) {
      return null;
    }

    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      return JSON.parse(text);
    } catch (err) {
      this.logger.error(`Failed to fetch ${cid}: ${err}`);
      return null;
    }
  }

  /// 获取 IPFS 网关 URL
  getGatewayUrl(cid: string): string {
    if (cid.startsWith('local://')) return cid;
    return `${this.gatewayUrl}/ipfs/${cid}`;
  }
}
