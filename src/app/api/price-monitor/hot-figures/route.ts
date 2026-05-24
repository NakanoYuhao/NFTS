// 热门潮玩手办价格数据
export async function GET() {
  const figures = [
    {
      id: '1', name: '初音未来 韶华Ver.', brand: 'GoodSmile', series: 'VOCALOID',
      imageUrl: '', currentPrice: 1280, priceRange: { min: 980, max: 1680 },
      trend: 'up' as const, changePercent: 12.5, platforms: ['闲鱼', '淘宝', 'B站'],
      lastUpdated: new Date().toISOString(), popularity: 95,
    },
    {
      id: '2', name: '哪吒之魔童降世 手办', brand: 'POPMART', series: '国漫之光',
      imageUrl: '', currentPrice: 699, priceRange: { min: 599, max: 899 },
      trend: 'up' as const, changePercent: 23.8, platforms: ['闲鱼', '拼多多', '淘宝'],
      lastUpdated: new Date().toISOString(), popularity: 92,
    },
    {
      id: '3', name: 'EVA 初号机 觉醒Ver.', brand: 'Bandai', series: 'Evangelion',
      imageUrl: '', currentPrice: 2480, priceRange: { min: 2200, max: 3200 },
      trend: 'down' as const, changePercent: -5.2, platforms: ['闲鱼', '淘宝', '京东'],
      lastUpdated: new Date().toISOString(), popularity: 78,
    },
    {
      id: '4', name: '崩坏星穹铁道 丹恒', brand: 'miHoYo', series: 'Honkai Star Rail',
      imageUrl: '', currentPrice: 899, priceRange: { min: 799, max: 1299 },
      trend: 'up' as const, changePercent: 18.3, platforms: ['闲鱼', '淘宝', 'B站'],
      lastUpdated: new Date().toISOString(), popularity: 88,
    },
    {
      id: '5', name: '鬼灭之刃 灶门炭治郎', brand: 'Aniplex', series: 'Demon Slayer',
      imageUrl: '', currentPrice: 1560, priceRange: { min: 1200, max: 1800 },
      trend: 'stable' as const, changePercent: 0.8, platforms: ['闲鱼', '淘宝'],
      lastUpdated: new Date().toISOString(), popularity: 85,
    },
    {
      id: '6', name: '原神 钟离 岩王帝君', brand: 'miHoYo', series: 'Genshin Impact',
      imageUrl: '', currentPrice: 1880, priceRange: { min: 1500, max: 2500 },
      trend: 'up' as const, changePercent: 15.6, platforms: ['闲鱼', '淘宝', 'B站', '拼多多'],
      lastUpdated: new Date().toISOString(), popularity: 90,
    },
    {
      id: '7', name: '初音未来 雪未来', brand: 'GoodSmile', series: 'VOCALOID',
      imageUrl: '', currentPrice: 1580, priceRange: { min: 1380, max: 2000 },
      trend: 'stable' as const, changePercent: 1.2, platforms: ['闲鱼', '淘宝'],
      lastUpdated: new Date().toISOString(), popularity: 72,
    },
    {
      id: '8', name: '崩坏3 琪亚娜 终焉', brand: 'miHoYo', series: 'Honkai Impact 3rd',
      imageUrl: '', currentPrice: 2200, priceRange: { min: 1800, max: 2800 },
      trend: 'down' as const, changePercent: -3.5, platforms: ['闲鱼', '淘宝', 'B站'],
      lastUpdated: new Date().toISOString(), popularity: 80,
    },
  ];

  return Response.json({ success: true, data: figures });
}
