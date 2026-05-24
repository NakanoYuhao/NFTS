'use client';

import ReactDOM from 'react-dom';
import { useEffect } from 'react';

export function FontPreload() {
  useEffect(() => {
    // 预连接到字体服务
    ReactDOM.preconnect('https://fonts.googleapis.cn');
    ReactDOM.preconnect('https://fonts.gstatic.cn');
    
    // 预加载字体CSS
    ReactDOM.preload(
      'https://fonts.googleapis.cn/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap',
      { as: 'style' }
    );
  }, []);
  
  return null;
}
