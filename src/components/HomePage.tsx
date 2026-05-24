'use client';

export function HomePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
      {/* 装饰背景元素 */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-teal-100/50 blur-3xl" />
      <div className="absolute bottom-20 right-10 w-72 h-72 rounded-full bg-orange-100/50 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Logo / 平台名称 */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="text-teal-600">OPEN</span>
            <span className="text-gray-800">-</span>
            <span className="text-orange-500">NFTs</span>
          </h1>
          <p className="mt-3 text-gray-400 text-lg">NFT潮玩创作平台</p>
        </div>

        {/* 两个模式按钮 */}
        <div className="flex gap-6">
          <button
            onClick={() => onNavigate('creator')}
            className="group px-10 py-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-lg rounded-2xl shadow-md shadow-teal-200 hover:shadow-lg hover:shadow-teal-300 transition-all hover:-translate-y-0.5"
          >
            创作者模式
          </button>
          <button
            onClick={() => onNavigate('enterprise')}
            className="group relative px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg rounded-2xl shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300 transition-all hover:-translate-y-0.5 opacity-60"
          >
            企业模式
            <span className="absolute -top-2 -right-2 text-[10px] bg-gray-500 text-white px-1.5 py-0.5 rounded-full">
              迁移中
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
