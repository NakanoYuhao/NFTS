// ================================================================
// 数据库修复：清理旧测试数据 + 创作者认证
// 用法: node fix-db.js
// ================================================================
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
  // 1. 清理旧测试数据（避免 tokenId 唯一约束冲突）
  const d1 = await p.derivative.deleteMany();
  const d2 = await p.policy.deleteMany();
  const d3 = await p.originalWork.deleteMany();
  const d4 = await p.auditLog.deleteMany();
  console.log(`Cleaned: ${d3.count} originals, ${d1.count} derivatives, ${d2.count} policies, ${d4.count} audit logs`);

  // 2. 确保所有创作者已认证
  const creators = await p.creator.findMany();
  if (creators.length > 0) {
    await p.creator.updateMany({ data: { isVerified: true } });
    console.log(`Verified: ${creators.length} creator(s)`);
  } else {
    console.log('No creators in DB yet');
  }

  await p.$disconnect();
  process.exit(0);
}
fix();
