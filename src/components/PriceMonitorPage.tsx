'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import {
  Search, TrendingUp, TrendingDown, Minus,
  Loader2, RefreshCw, ExternalLink, ArrowLeft,
} from 'lucide-react';

// ---- Types ----
interface RealTimeFigure {
  id: string; name: string; brand: string; series: string;
  imageUrl: string; currentPrice: number;
  priceRange: { min: number; max: number };
  trend: 'up' | 'down' | 'stable'; changePercent: number;
  platforms: string[]; lastUpdated: string; popularity: number;
}

interface PriceSearchResult {
  query: string;
  prices: { name: string; price: number; platform: string; url?: string }[];
  summary: string; lastUpdated: string;
}

// ---- Mini Sparkline ----
function Sparkline({ trend, width = 60, height = 20 }: { trend: 'up' | 'down' | 'stable'; width?: number; height?: number }) {
  const color = trend === 'up' ? '#ef4444' : trend === 'down' ? '#10b981' : '#9ca3af';
  const mid = height / 2;
  const points = trend === 'up'
    ? `0,${height - 2} ${width * 0.25},${mid + 4} ${width * 0.5},${mid - 2} ${width * 0.75},${mid - 4} ${width},2`
    : trend === 'down'
    ? `0,2 ${width * 0.25},${mid - 4} ${width * 0.5},${mid + 2} ${width * 0.75},${mid + 4} ${width},${height - 2}`
    : `0,${mid} ${width * 0.33},${mid - 1} ${width * 0.66},${mid + 1} ${width},${mid}`;
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ---- Figure Card ----
function FigureCard({ figure, onSelect }: { figure: RealTimeFigure; onSelect: (f: RealTimeFigure) => void }) {
  const trendIcon = figure.trend === 'up'
    ? <TrendingUp className="h-4 w-4 text-rose-500" />
    : figure.trend === 'down'
    ? <TrendingDown className="h-4 w-4 text-emerald-500" />
    : <Minus className="h-4 w-4 text-gray-400" />;

  const trendColor = figure.trend === 'up' ? 'text-rose-500' : figure.trend === 'down' ? 'text-emerald-500' : 'text-gray-400';

  return (
    <Card
      className="group cursor-pointer border border-gray-100 hover:border-teal-200 hover:shadow-md hover:shadow-teal-50 transition-all duration-200 bg-white"
      onClick={() => onSelect(figure)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Image */}
          <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            <span className="text-3xl">{figure.name.slice(0, 2)}</span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{figure.name}</h3>
              <Sparkline trend={figure.trend} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{figure.brand} · {figure.series}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg font-bold text-gray-900">¥{figure.currentPrice.toLocaleString()}</span>
              <span className={`text-xs font-medium ${trendColor} flex items-center gap-0.5`}>
                {trendIcon}
                {figure.changePercent > 0 ? '+' : ''}{figure.changePercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex gap-1 mt-1.5">
              {figure.platforms.slice(0, 3).map(p => (
                <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500 border-gray-100">{p}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---- Main Page ----
interface PriceMonitorPageProps {
  onNavigate: (page: import('@/types').PageType) => void;
}

export function PriceMonitorPage({ onNavigate }: PriceMonitorPageProps) {
  const [figures, setFigures] = useState<RealTimeFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PriceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFigures = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/price-monitor/hot-figures');
      const data = await res.json();
      if (data.success) setFigures(data.data);
      else setError(data.error || '获取数据失败');
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFigures(); }, [fetchFigures]);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch('/api/price-monitor/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
      else setError(data.error || '搜索失败');
    } catch {
      setError('搜索失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button onClick={() => onNavigate('creator')} variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">潮玩价格监控</h1>
        <Button onClick={() => fetchFigures(true)} variant="ghost" size="icon"
          disabled={refreshing} className="text-gray-400 hover:text-teal-500">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="px-4 py-3 border-b border-gray-50">
        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索手办/潮玩名称..."
            className="flex-1 h-10 rounded-xl border-gray-200 focus:border-teal-400 focus:ring-teal-100"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching || !keyword.trim()}
            className="h-10 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
            <p className="text-sm text-gray-400">正在获取热门手办价格...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
            <span className="text-rose-500 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-rose-700">{error}</p>
              <button onClick={() => fetchFigures()} className="text-xs text-rose-500 hover:underline mt-1">点击重试</button>
            </div>
          </div>
        )}

        {/* Search results */}
        {searchResults && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">搜索结果: {searchResults.query}</h2>
              <Button variant="ghost" size="sm" className="text-xs text-gray-400"
                onClick={() => setSearchResults(null)}>清除</Button>
            </div>
            {searchResults.prices.length > 0 ? (
              <div className="space-y-2">
                {searchResults.prices.map((p, i) => (
                  <Card key={i} className="p-3 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.platform}</p>
                      </div>
                      <span className="text-lg font-bold text-teal-600">¥{p.price.toLocaleString()}</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">未找到相关结果</p>
            )}
            <p className="text-xs text-gray-400 mt-2">{searchResults.summary}</p>
          </div>
        )}

        {/* Figure list */}
        {!loading && !error && !searchResults && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">热门潮玩</h2>
              <span className="text-xs text-gray-400">{figures.length} 个</span>
            </div>
            {figures.length > 0 ? (
              <div className="space-y-3">
                {figures.map(f => (
                  <FigureCard key={f.id} figure={f} onSelect={() => {}} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-20">暂无数据</p>
            )}
          </>
        )}
      </div>

      <BottomNav currentPage="price-monitor" onNavigate={onNavigate} />
    </div>
  );
}
