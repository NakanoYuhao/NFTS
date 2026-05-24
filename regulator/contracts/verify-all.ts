// ================================================================
// 自动认证所有 Hardhat 测试账户（演示准备脚本）
// 用法: npx hardhat run verify-all.ts --network localhost
// ================================================================
import { ethers } from 'hardhat';

const CREATOR_REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const ACCOUNTS = [
  { name: 'Admin',    addr: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
  { name: 'Creator#1', addr: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
  { name: 'Creator#2', addr: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const cr = await ethers.getContractAt(
    ['function registerCreator(address,string,bytes32)', 'function verifyCreator(address)'],
    CREATOR_REGISTRY,
    deployer,
  );

  console.log('=== Auto-verifying Hardhat test accounts ===\n');

  for (const a of ACCOUNTS) {
    const did = `did:fisco:bcos:${a.addr.toLowerCase()}`;
    const didDoc = { id: did };
    const didHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(didDoc)));

    // 注册 DID（如果尚未注册）
    try {
      const tx1 = await cr.registerCreator(a.addr, did, didHash);
      await tx1.wait();
      console.log(`  ${a.name}: DID registered`);
    } catch (e: any) {
      if (e.message?.includes('Already registered')) {
        console.log(`  ${a.name}: DID exists (skip)`);
      } else {
        console.log(`  ${a.name}: DID error - ${e.message?.slice(0, 60)}`);
      }
    }

    // 管理员认证
    try {
      const tx2 = await cr.verifyCreator(a.addr);
      await tx2.wait();
      console.log(`  ${a.name}: verified `);
    } catch (e: any) {
      console.log(`  ${a.name}: verify error - ${e.message?.slice(0, 60)}`);
    }
  }

  console.log('\n=== All accounts verified on-chain ===');
}

main().catch((e) => { console.error(e); process.exit(1); });
