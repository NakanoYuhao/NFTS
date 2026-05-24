-- NFC 二创监管平台 - 数据库初始化脚本
-- 在 PostgreSQL 首次启动时自动执行

-- 注意：表结构由 Prisma Migrate 管理，此文件仅用于初始扩展
-- 运行 Prisma Migrate: npx prisma migrate dev --name init

-- 创建索引（补充 Prisma Schema 以外的性能优化）
-- CREATE INDEX IF NOT EXISTS idx_original_works_created ON original_works(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_derivatives_created ON derivatives(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(operator, action, created_at);
