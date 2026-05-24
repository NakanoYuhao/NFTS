import { NextRequest } from 'next/server';

// 模拟跨平台价格搜索
export async function POST(request: NextRequest) {
  const { keyword } = await request.json();
  if (!keyword) {
    return Response.json({ success: false, error: '请输入搜索关键词' }, { status: 400 });
  }

  const base = Math.floor(Math.random() * 1000) + 500;
  const platforms = ['闲鱼', '淘宝', '京东', '拼多多', 'B站会员购'];

  const prices = platforms.map(platform => ({
    name: `${keyword}${Math.random() > 0.5 ? ' (全新)' : ' (拆摆)'}`,
    price: base + Math.floor(Math.random() * 600) - 200,
    platform,
    condition: Math.random() > 0.4 ? '全新' : '拆摆无盒',
  })).sort((a, b) => a.price - b.price);

  const avg = prices.reduce((s, p) => s + p.price, 0) / prices.length;

  return Response.json({
    success: true,
    data: {
      query: keyword,
      prices,
      summary: `共找到 ${prices.length} 个结果，价格区间 ¥${prices[0].price} - ¥${prices[prices.length - 1].price}，均价约 ¥${Math.round(avg)}`,
      lastUpdated: new Date().toISOString(),
    },
  });
}
