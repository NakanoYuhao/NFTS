// ============================================================
// 图片白色背景透明化工具
// 方案B：豆包生图时背景为纯白色(#FFFFFF)，前端用Canvas容差透明化+边缘羽化
// ============================================================

/**
 * 将图片中的白色背景透明化
 * @param imageUrl 原始图片URL
 * @param tolerance 容差（0-255），越大多化范围越宽，默认30
 * @param featherRadius 边缘羽化像素半径，默认2
 * @returns 透明化后的PNG dataURL
 */
export async function removeWhiteBackground(
  imageUrl: string,
  tolerance: number = 30,
  featherRadius: number = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 绘制原图
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 第一遍：标记所有接近白色的像素，记录透明度
        const width = canvas.width;
        const height = canvas.height;

        // 先创建一个mask，标记哪些像素需要透明化
        const mask = new Float32Array(width * height); // 0=不透明, 1=完全透明

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // 计算与纯白色的距离
          const dist = Math.sqrt(
            (255 - r) * (255 - r) +
            (255 - g) * (255 - g) +
            (255 - b) * (255 - b)
          );

          if (dist <= tolerance) {
            // 在容差范围内，完全透明
            mask[i / 4] = 1;
          } else if (dist <= tolerance + featherRadius * 10) {
            // 在羽化范围内，部分透明（线性过渡）
            const featherDist = (dist - tolerance) / (featherRadius * 10);
            mask[i / 4] = 1 - featherDist;
          }
        }

        // 第二遍：从边缘向内做羽化处理（扩展透明区域）
        if (featherRadius > 0) {
          const expandedMask = new Float32Array(mask);
          // 对每个透明像素，向featherRadius范围内的非透明像素施加部分透明
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = y * width + x;
              if (mask[idx] > 0) {
                // 这个像素需要透明化，向周围扩散羽化
                for (let dy = -featherRadius; dy <= featherRadius; dy++) {
                  for (let dx = -featherRadius; dx <= featherRadius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    const nIdx = ny * width + nx;
                    if (mask[nIdx] === 0) {
                      // 计算距离权重（越远越不透明）
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      if (dist <= featherRadius) {
                        const weight = 1 - dist / featherRadius;
                        expandedMask[nIdx] = Math.max(expandedMask[nIdx], weight * 0.6);
                      }
                    }
                  }
                }
              }
            }
          }
          // 应用扩展后的mask
          for (let i = 0; i < expandedMask.length; i++) {
            const alpha = Math.round((1 - expandedMask[i]) * 255);
            data[i * 4 + 3] = Math.min(data[i * 4 + 3], alpha);
          }
        } else {
          // 无羽化，直接应用mask
          for (let i = 0; i < mask.length; i++) {
            const alpha = Math.round((1 - mask[i]) * 255);
            data[i * 4 + 3] = Math.min(data[i * 4 + 3], alpha);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      // 图片加载失败时返回原图URL
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}
