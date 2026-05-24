import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// 手动加载 ABI（从 Hardhat artifacts）
const loadAbi = (name: string): any[] => {
  try {
    const fs = require('fs');
    const path = require('path');
    // 运行时路径: backend/dist/common/chain/
    const artifactPath = path.join(
      __dirname, '..', '..', '..', '..', 'contracts', 'artifacts', 'src',
      `${name}.sol`, `${name}.json`,
    );
    const data = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return data.abi;
  } catch {
    return [];
  }
};

// 预加载所有合约 ABI
const CONTRACT_ABIS: Record<string, any[]> = {};

@Injectable()
export class ChainService implements OnModuleInit {
  private readonly logger = new Logger(ChainService.name);
  provider: ethers.JsonRpcProvider;
  signer: ethers.Wallet;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const rpcUrl = this.configService.get<string>('CHAIN_RPC', 'http://127.0.0.1:8545');
    const privateKey = this.configService.get<string>('PLATFORM_PRIVATE_KEY', '');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.logger.log(`Connected to RPC: ${rpcUrl}`);

    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.logger.log(`Signer: ${this.signer.address}`);
    }

    // 预加载 ABI
    const names = [
      'CreatorRegistry', 'OriginalWork', 'LicenseToken',
      'DerivativeNFT', 'DerivativeRule', 'RoyaltySplitter', 'NfcSealRegistry',
    ];
    for (const name of names) {
      CONTRACT_ABIS[name] = loadAbi(name);
      if (CONTRACT_ABIS[name].length > 0) {
        this.logger.log(`ABI loaded: ${name}`);
      } else {
        this.logger.warn(`ABI not loaded: ${name}`);
      }
    }
  }

  /// 获取合约地址（从环境变量）
  getContractAddr(name: string): string {
    const envKey = `CONTRACT_${name.toUpperCase()}`;
    return this.configService.get<string>(envKey, '');
  }
  // 别名，兼容其他模块
  getContractAddress(name: string): string {
    return this.getContractAddr(name);
  }

  /// 创建一个有签名器的合约实例（用于写操作）
  getContract(name: string): ethers.Contract {
    const addr = this.getContractAddr(name);
    const abi = CONTRACT_ABIS[name];
    if (!addr) throw new Error(`Contract ${name} address not configured`);
    if (!abi || abi.length === 0) throw new Error(`Contract ${name} ABI not loaded`);
    return new ethers.Contract(addr, abi, this.signer);
  }

  /// 通用合约写调用，返回 { tx, receipt }
  async callContract(name: string, method: string, args: any[]): Promise<{ tx: ethers.TransactionResponse; receipt: ethers.TransactionReceipt | null }> {
    const contract = this.getContract(name);
    this.logger.log(`TX: ${name}.${method} (args=${args.length})`);
    const tx = await contract[method](...args);
    this.logger.log(`TX sent: ${tx.hash.slice(0, 20)}...`);
    const receipt = await tx.wait();
    this.logger.log(`TX mined: block=${receipt?.blockNumber}`);
    return { tx, receipt };
  }

  /// 通用合约读调用
  async queryContract(name: string, method: string, args: any[]): Promise<any> {
    const addr = this.getContractAddr(name);
    const abi = CONTRACT_ABIS[name];
    if (!addr || !abi) return null;
    const contract = new ethers.Contract(addr, abi, this.provider);
    return await contract[method](...args);
  }

  /// 验证签名
  verifySignature(address: string, message: string, signature: string): boolean {
    try {
      const recovered = ethers.verifyMessage(message, signature);
      return recovered.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }

  /// 解析事件
  parseEvent(receipt: ethers.TransactionReceipt, eventName: string): any {
    for (const name of Object.keys(CONTRACT_ABIS)) {
      try {
        const iface = new ethers.Interface(CONTRACT_ABIS[name]);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (parsed && parsed.name === eventName) {
              const result: any = {};
              for (let i = 0; i < parsed.args.length; i++) {
                result[parsed.fragment.inputs[i].name] = parsed.args[i];
              }
              return result;
            }
          } catch { continue; }
        }
      } catch { continue; }
    }
    throw new Error(`Event ${eventName} not found`);
  }
}
