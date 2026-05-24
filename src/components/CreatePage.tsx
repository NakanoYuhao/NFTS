'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BottomNav } from '@/components/BottomNav';
import { CreateMode, PageType, Collectible } from '@/types';
import { removeWhiteBackground } from '@/lib/removeBackground';

interface CreatePageProps {
  mode: CreateMode;
  onNavigate: (page: PageType) => void;
  onCreate: (collectible: Collectible) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function CreatePage({ mode, onNavigate, onCreate, isLoading, setIsLoading }: CreatePageProps) {
  const isPhotoMode = mode === 'photo';
  const [step, setStep] = useState(isPhotoMode ? 1 : 2);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  
  // 用户输入的名称和介绍
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  
  // 编辑的内容
  const [editContent, setEditContent] = useState({
    name: '',
    intro: '',
    story: '',
    character: '',
    appearance: '',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 万物潮玩：AI根据名称+介绍+图片生成
  const handleAIGenerate = async () => {
    if (!imageFile || !name.trim() || !intro.trim()) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('name', name.trim());
      formData.append('intro', intro.trim());
      
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditContent({
          name: name.trim(),
          intro: intro.trim(),
          story: data.data.story || '',
          character: data.data.character || '',
          appearance: data.data.appearance || '',
        });
        setStep(2);
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (error) {
      console.error('AI生成失败:', error);
      setEditContent({
        name: name.trim(),
        intro: intro.trim(),
        story: '诞生于数字世界的神秘角落，拥有穿越虚拟与现实的能力。它见证了无数数据的流动，理解着人类与机器之间的微妙联系。',
        character: '神秘而友善，对新鲜事物充满好奇，喜欢与创造者交流。',
        appearance: '独特的数字形态，散发着迷人的光芒，仿佛来自另一个维度。',
      });
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  // 自由创作：AI根据名称+介绍补全其他内容
  const handleAIFill = async () => {
    if (!editContent.name.trim() || !editContent.intro.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editContent.name.trim(),
          intro: editContent.intro.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEditContent({
          ...editContent,
          story: data.data.story || editContent.story,
          character: data.data.character || editContent.character,
          appearance: data.data.appearance || editContent.appearance,
        });
      } else {
        throw new Error(data.error || '补全失败');
      }
    } catch (error) {
      console.error('AI补全失败:', error);
      setEditContent({
        ...editContent,
        story: '诞生于数字世界的神秘角落，拥有穿越虚拟与现实的能力。',
        character: '神秘而友善，对新鲜事物充满好奇。',
        appearance: '独特的数字形态，散发着迷人的光芒。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 生成潮玩：并行调用 图片生成 + 人格锚点生成，并对图片做白色背景透明化
  const handleGenerateSprites = async () => {
    setIsLoading(true);
    try {
      // 万物潮玩模式：先上传原始图片到S3，获取URL用于图生图
      let imageUrl = uploadedImageUrl;
      if (isPhotoMode && imageFile && !uploadedImageUrl) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('image', imageFile);
          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            body: uploadFormData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.imageUrl) {
            imageUrl = uploadData.imageUrl;
            setUploadedImageUrl(imageUrl);
          }
        } catch (uploadError) {
          console.error('上传原始图片失败，将不使用参考图:', uploadError);
        }
      }

      // 并行请求：图片生成 + 人格锚点生成
      const [spritesRes, personaRes] = await Promise.all([
        fetch('/api/generate-sprites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editContent.name,
            intro: editContent.intro,
            appearance: editContent.appearance,
            story: editContent.story,
            character: editContent.character,
            ...(imageUrl ? { imageUrl } : {}),
          }),
        }),
        fetch('/api/generate-persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appearance: editContent.appearance,
            story: editContent.story,
            character: editContent.character,
            name: editContent.name,
            intro: editContent.intro,
            ...(imageUrl ? { imageUrl } : {}),
          }),
        }),
      ]);

      const spritesData = await spritesRes.json();
      const personaData = await personaRes.json();

      // 人格锚点：优先使用AI生成的，降级使用拼接的
      const persona = personaData.success && personaData.persona
        ? personaData.persona
        : `你是一个名为"${editContent.name}"的NFT潮玩。介绍：${editContent.intro}。性格：${editContent.character}。背景：${editContent.story}。${editContent.appearance ? `外表：${editContent.appearance}。` : ''}请用符合你性格的方式与用户对话，保持趣味性。`;

      // 人格输出控制指令（Agentic Protocol）：v3新增
      const personaProtocol = (personaData.success && personaData.personaProtocol)
        ? personaData.personaProtocol
        : '';

      // 图片：对AI生成的图片做白色背景透明化处理，再上传到S3避免localStorage溢出
      let spritesUrl = spritesData.success ? spritesData.spritesUrl : (imagePreview || '');
      if (spritesData.success && spritesData.spritesUrl) {
        try {
          const transparentDataUrl = await removeWhiteBackground(spritesData.spritesUrl, 30, 2);
          // 将透明化后的图片上传到S3，只存储URL
          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: transparentDataUrl }),
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.imageUrl) {
            spritesUrl = uploadJson.imageUrl;
          } else {
            spritesUrl = transparentDataUrl;
          }
        } catch (e) {
          console.error('背景透明化或上传失败，使用原图URL:', e);
        }
      } else if (spritesUrl.startsWith('data:')) {
        // 降级图片也是data URL，尝试上传到S3
        try {
          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: spritesUrl }),
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.imageUrl) {
            spritesUrl = uploadJson.imageUrl;
          }
        } catch (e) {
          console.error('降级图片上传失败:', e);
        }
      }

      const collectible: Collectible = {
        id: `collectible-${Date.now()}`,
        metadata: {
          createdAt: new Date().toISOString(),
          author: '用户',
        },
        sprites: spritesUrl,
        persona,
        personaProtocol,
        memory: [],
        name: editContent.name.trim(),
        intro: editContent.intro.trim(),
        appearance: editContent.appearance,
        story: editContent.story,
        character: editContent.character,
        hasNftId: false,
      };
      
      onCreate(collectible);
      onNavigate('collection');
    } catch (error) {
      console.error('生成潮玩失败:', error);
      // 降级：使用图片预览和拼接人格
      const fallbackPersona = `你是一个名为"${editContent.name}"的NFT潮玩。介绍：${editContent.intro}。性格：${editContent.character}。背景：${editContent.story}。${editContent.appearance ? `外表：${editContent.appearance}。` : ''}请用符合你性格的方式与用户对话，保持趣味性。`;
      
      // 尝试上传降级图片到S3
      let fallbackSprites = imagePreview || '';
      if (fallbackSprites.startsWith('data:')) {
        try {
          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: fallbackSprites }),
          });
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.imageUrl) {
            fallbackSprites = uploadJson.imageUrl;
          }
        } catch (uploadErr) {
          console.error('降级图片上传失败:', uploadErr);
        }
      }
      
      const collectible: Collectible = {
        id: `collectible-${Date.now()}`,
        metadata: {
          createdAt: new Date().toISOString(),
          author: '用户',
        },
        sprites: fallbackSprites,
        persona: fallbackPersona,
        personaProtocol: '',
        memory: [],
        name: editContent.name.trim(),
        intro: editContent.intro.trim(),
        appearance: editContent.appearance,
        story: editContent.story,
        character: editContent.character,
        hasNftId: false,
      };
      
      onCreate(collectible);
      onNavigate('collection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 头部 */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Button
          onClick={() => onNavigate('creator')}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          ← 返回
        </Button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">
          {isPhotoMode ? '万物潮玩' : '自由创作'}
        </h1>
        <div className="w-20" />
      </div>

      {/* 主内容 */}
      <div className="flex-1 overflow-auto p-4">
        {/* 步骤指示器 */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step >= s
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-0.5 transition-all ${
                      step > s ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-12 mt-2 text-xs text-gray-400">
            <span>{isPhotoMode ? '上传与命名' : '编辑信息'}</span>
            <span>润色内容</span>
            <span>生成潮玩</span>
          </div>
        </div>

        {/* 步骤内容 */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 步骤1: 上传照片+输入名称和介绍 (仅万物潮玩) */}
          {isPhotoMode && step === 1 && (
            <div className="space-y-6">
              <div className="text-center text-gray-500 mb-4">
                上传一张照片，输入名称和介绍，AI将为你生成独特的NFT潮玩
              </div>
              
              <div className="relative aspect-square max-w-xs mx-auto rounded-2xl border-2 border-dashed border-gray-300 hover:border-teal-400 transition-all overflow-hidden bg-gray-50">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="预览"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all">
                    <div className="text-6xl mb-4">📸</div>
                    <p className="text-gray-400">点击上传照片</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
                {imagePreview && (
                  <label className="absolute inset-0 cursor-pointer bg-black/40 opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                    <span className="text-white font-medium">点击更换照片</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 名称和介绍输入 */}
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="text-sm text-gray-600 block mb-2 font-medium">名称</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="给你的潮玩起个名字"
                    className="bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2 font-medium">一句话介绍</label>
                  <Input
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    placeholder="用一句话描述这个潮玩"
                    className="bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleAIGenerate}
                  disabled={!imageFile || !name.trim() || !intro.trim() || isLoading}
                  className="h-12 px-8 bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-sm transition-all"
                >
                  {isLoading ? '生成中...' : 'AI 生成 →'}
                </Button>
              </div>
            </div>
          )}

          {/* 步骤2: 编辑内容 */}
          {step === 2 && (
            <div className="space-y-6">
              {/* 图片预览（万物潮玩模式） */}
              {isPhotoMode && imagePreview && (
                <div className="aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden border border-gray-200">
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2 font-medium">名称</label>
                  <Input
                    value={editContent.name}
                    onChange={(e) => setEditContent({ ...editContent, name: e.target.value })}
                    placeholder="给你的潮玩起个名字"
                    className="bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-2 font-medium">一句话介绍</label>
                  <Input
                    value={editContent.intro}
                    onChange={(e) => setEditContent({ ...editContent, intro: e.target.value })}
                    placeholder="用一句话描述这个潮玩"
                    className="bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900"
                  />
                </div>

                {/* 自由创作模式下的AI补全按钮 */}
                {!isPhotoMode && (
                  <div className="flex justify-center">
                    <Button
                      onClick={handleAIFill}
                      disabled={!editContent.name.trim() || !editContent.intro.trim() || isLoading}
                      variant="outline"
                      className="border-orange-400 text-orange-500 hover:bg-orange-50 hover:text-orange-600 rounded-xl"
                    >
                      {isLoading ? 'AI 补全中...' : '✨ AI 补全其余内容'}
                    </Button>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-600 block mb-2 font-medium">外表描述</label>
                  <Textarea
                    value={editContent.appearance}
                    onChange={(e) => setEditContent({ ...editContent, appearance: e.target.value })}
                    placeholder="描述潮玩的外表特征"
                    className="bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900 min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-2 font-medium">背景故事</label>
                  <Textarea
                    value={editContent.story}
                    onChange={(e) => setEditContent({ ...editContent, story: e.target.value })}
                    placeholder="讲述潮玩的背景故事"
                    className="bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900 min-h-[150px]"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-2 font-medium">性格特征</label>
                  <Textarea
                    value={editContent.character}
                    onChange={(e) => setEditContent({ ...editContent, character: e.target.value })}
                    placeholder="描述潮玩的性格特点"
                    className="bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 text-gray-900 min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                {isPhotoMode && (
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    ← 上一步
                  </Button>
                )}
                <Button
                  onClick={() => setStep(3)}
                  disabled={!editContent.name || !editContent.intro || !editContent.story || !editContent.character}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                >
                  下一步 →
                </Button>
              </div>
            </div>
          )}

          {/* 步骤3: 生成潮玩 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center text-gray-500 mb-4">
                确认信息，生成你的NFT潮玩
              </div>

              {/* 内容预览 */}
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">名称</label>
                  <p className="text-gray-900 mt-1 font-medium">{editContent.name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">一句话介绍</label>
                  <p className="text-gray-900 mt-1">{editContent.intro}</p>
                </div>
                {editContent.appearance && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">外表描述</label>
                    <p className="text-gray-700 mt-1">{editContent.appearance}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">背景故事</label>
                  <p className="text-gray-700 mt-1">{editContent.story}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">性格特征</label>
                  <p className="text-gray-700 mt-1">{editContent.character}</p>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  ← 上一步
                </Button>
                <Button
                  onClick={handleGenerateSprites}
                  disabled={isLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isLoading ? '生成中...' : '🎨 生成潮玩'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav currentPage={mode === 'photo' ? 'create-photo' : 'create-free'} onNavigate={onNavigate} />
    </div>
  );
}
