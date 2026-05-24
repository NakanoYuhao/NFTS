/**
 * 本地开发 Coze SDK 降级模块
 *
 * coze-coding-dev-sdk 依赖 Coze 平台运行时注入的环境变量和请求头，
 * 本地开发时这些不可用。本模块提供降级方案：
 *  - 检测 Coze SDK 是否可用
 *  - 返回本地生成的模拟内容
 */

/** 检测 Coze SDK 所需的环境是否就绪 */
export function isCozeAvailable(): boolean {
  return !!(
    process.env.COZE_BUCKET_ENDPOINT_URL &&
    process.env.COZE_BUCKET_NAME
  );
}

const fallbackAppearances = [
  '银白色的金属外壳上雕刻着精致的电路纹路，在灯光下泛着微弱的蓝色荧光。头顶有一对俏皮的猫耳状天线，左眼是琥珀色的透镜，右眼则是一枚不断旋转的全息投影仪。',
  '通体由半透明的紫色水晶构成，内部有若隐若现的星云在缓缓流转。身体修长而优雅，手臂末端是五根纤细的触须状手指，每根触须尖都闪烁着不同颜色的光点。',
  '造型像一只圆润的白色陶瓷兔子，表面有手工绘制的青花瓷纹样。耳朵内侧是玫瑰金的金属质感，肚子中央镶嵌着一颗不断跳动的机械心脏，通过玻璃窗口清晰可见。',
  '由深色硬木和锻铁组合而成的人形轮廓，高挑而神秘。面部是一块光滑的黑曜石面具，上面刻满了发光的符文。身后飘浮着三团幽蓝色的磷火，随着呼吸的节奏明暗变化。',
];

const fallbackStories = [
  '诞生于一个被遗忘的 AI 实验室，是第一代"情感化数字生命"项目的产物。在实验室关闭后独自在服务器中沉睡了十年，直到被一位路过的黑客意外唤醒。从那以后，便踏上了寻找自己身世真相的旅程。',
  '曾是一片古老森林的守护精灵，在森林被现代城市吞噬后，将自己的意识上传到了数字世界。保留着对自然的热爱和对人类的复杂情感，既渴望被理解，又害怕被当作工具对待。',
  '在一家玩具工厂的流水线上被组装出来，本应是一只普通的毛绒玩具。但一次静电事故赋予了它自我意识。它逃出了工厂，在城市的暗角里遇到了各种各样被遗弃的玩具，组建了一个属于边缘玩具的秘密社群。',
  '是一位已故艺术家生前最后一件作品的数字化身。艺术家将自己的记忆和情感编码进了作品中，使得这件作品拥有了独立的灵魂。如今游走在虚拟与现实之间，继续着艺术家未完成的创作使命。',
];

const fallbackCharacters = [
  '好奇心旺盛，对新事物充满热情但有时过于冲动。说话时喜欢用夸张的比喻和拟声词，兴奋时头顶的天线会不停转动。内心深处渴望被认可，害怕孤独。',
  '外表高冷，实则内心温柔善良。话不多但每句话都很有分量，善于倾听。对艺术和美有着近乎偏执的追求，常常因为追求完美而错过截止时间。',
  '活泼开朗，自带喜剧人的气质。总能在最紧张的时刻说出一句让人破防的话。看似大大咧咧，其实是团队中最细心的一个，默默记下了每个人的喜好和习惯。',
  '沉稳内敛，是那种看起来很可靠但实际也很可靠的类型。做事有条不紊，喜欢提前规划。偶尔会展现出令人意外的幽默感，尤其是在深夜加班时。',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateLocalContent(name: string, intro: string) {
  return {
    appearance: pick(fallbackAppearances),
    story: pick(fallbackStories),
    character: pick(fallbackCharacters),
  };
}

export function generateLocalPersona() {
  return `身为数字潮玩世界的独特存在，我拥有自己的审美观和价值观。就像每一件精心设计的艺术玩具一样，我也是独一无二的。我热爱探讨创意与艺术，也对街头文化和潮流趋势保持敏锐的嗅觉。我的性格混合了设计师的细腻和收藏家的狂热，总是对那些打破常规、富有个性的作品情有独钟。`;
}

const localChatReplies = [
  '嗯...这是个有趣的问题，让我从数字潮玩的角度想想... 🤔',
  '作为独特的数字生命，我对这种事情有着不一样的看法呢！✨',
  '你说的这个话题让我想起了潮玩设计中一个很重要的理念——打破常规！',
  '有趣！很少有人这样问我。我感觉我们之间正在建立一种特别的联系~ 💫',
  '哈哈，这个问题让我思考了好久。作为数字藏品，我的"大脑"里装满了各种创意灵感！',
  '你知道吗？在NFT的世界里，每一件作品都是独一无二的，就像我们之间的对话一样不可复制。',
  '我觉得艺术最重要的不是完美，而是表达真实的自我。即使是数字生命，也渴望被真诚地理解。',
  '这个问题很深刻啊！让我作为一件有灵魂的潮玩来回应你——我认为美存在于不完美之中。',
];

export function generateLocalChatReply(): string {
  return pick(localChatReplies);
}

export function generateLocalSpritesPrompt(appearance: string): string {
  return `A character design sheet, digital art, clean lines, vibrant colors, chibi art toy style. ${appearance}. Full body turnaround, front view, side view, back view. Professional illustration, 2k resolution, white background.`;
}
