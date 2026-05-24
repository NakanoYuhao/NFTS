'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, FolderOpen, Sparkles, ExternalLink } from 'lucide-react';

const REGULATOR_URL = '/regulator';

interface EnterprisePageProps {
  onNavigate: (page: 'home') => void;
}

export function EnterprisePage({ onNavigate }: EnterprisePageProps) {
  const openRegulator = (path: string) => {
    window.open(`${REGULATOR_URL}/index.html#${path}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          onClick={() => onNavigate('home')}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          ← 返回
        </Button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">
          企业模式 · 二创监管平台
        </h1>
        <div className="w-20" />
      </div>

      {/* 功能入口 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <p className="text-gray-500 text-sm mb-4">
          以下服务将在新标签页中打开二创监管平台
        </p>

        <Card className="w-full max-w-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openRegulator('/dashboard')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-teal-600" />
              防炒作 / 合规监管
            </CardTitle>
            <CardDescription>
              查看平台数据概览、审计日志，监控衍生品合规状态
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="w-full max-w-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openRegulator('/ip-assets')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="w-5 h-5 text-teal-600" />
              IP 资产管理
            </CardTitle>
            <CardDescription>
              管理已注册的原创 IP、查看衍生品列表、设定二创规则
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="w-full max-w-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openRegulator('/ip-assets/register')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-teal-600" />
              IP 孵化 / 注册新原作
            </CardTitle>
            <CardDescription>
              将 AI 生成的藏品登记为区块链上的原创 IP，开启二创授权
            </CardDescription>
          </CardHeader>
        </Card>

        <p className="text-gray-300 text-xs mt-8 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          二创监管平台运行在 localhost:5173
        </p>
      </div>
    </div>
  );
}
