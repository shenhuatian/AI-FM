// 简单的 SVG 图标生成器
// 生成 Nothing Design 风格的应用图标

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 icons 目录
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 图标尺寸
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// 生成 SVG 图标
function generateSVG(size) {
  const padding = size * 0.2;
  const iconSize = size - padding * 2;
  const strokeWidth = size * 0.08;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="${size}" height="${size}" fill="#000000"/>

  <!-- 音符图标 -->
  <g transform="translate(${padding}, ${padding})">
    <!-- 音符杆 -->
    <rect x="${iconSize * 0.35}" y="${iconSize * 0.15}" width="${strokeWidth}" height="${iconSize * 0.5}" fill="#00ff88" rx="${strokeWidth / 2}"/>

    <!-- 音符头 -->
    <ellipse cx="${iconSize * 0.35 + strokeWidth / 2}" cy="${iconSize * 0.7}" rx="${iconSize * 0.12}" ry="${iconSize * 0.1}" fill="#00ff88"/>

    <!-- 第二个音符杆 -->
    <rect x="${iconSize * 0.55}" y="${iconSize * 0.25}" width="${strokeWidth}" height="${iconSize * 0.45}" fill="#00ff88" rx="${strokeWidth / 2}"/>

    <!-- 第二个音符头 -->
    <ellipse cx="${iconSize * 0.55 + strokeWidth / 2}" cy="${iconSize * 0.75}" rx="${iconSize * 0.12}" ry="${iconSize * 0.1}" fill="#00ff88"/>

    <!-- 连接线 -->
    <path d="M ${iconSize * 0.35 + strokeWidth} ${iconSize * 0.15} Q ${iconSize * 0.5} ${iconSize * 0.1} ${iconSize * 0.55} ${iconSize * 0.25}"
          stroke="#00ff88" stroke-width="${strokeWidth * 0.6}" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 底部文字 -->
  <text x="${size / 2}" y="${size * 0.9}"
        font-family="monospace"
        font-size="${size * 0.12}"
        font-weight="bold"
        fill="#00ff88"
        text-anchor="middle">CLAUDIO</text>
</svg>`;
}

// 生成所有尺寸的图标
console.log('🎨 开始生成 Nothing Design 风格图标...\n');

sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`✅ 生成: ${filename}`);
});

console.log('\n✨ 图标生成完成！');
console.log(`📁 位置: ${iconsDir}`);
console.log('\n💡 提示:');
console.log('   - SVG 图标已生成，可以直接使用');
console.log('   - 如需 PNG 格式，请使用在线转换工具');
console.log('   - 推荐: https://cloudconvert.com/svg-to-png');
console.log('   - 或使用 sharp 库批量转换为 PNG\n');
