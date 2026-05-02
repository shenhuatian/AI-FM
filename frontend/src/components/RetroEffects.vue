<template>
  <div class="retro-effects">
    <!-- 噪点纹理 -->
    <canvas ref="noiseCanvas" class="noise-layer"></canvas>

    <!-- 扫描线效果 -->
    <div class="scanlines"></div>

    <!-- 轻微的晕影效果 -->
    <div class="vignette"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const noiseCanvas = ref(null)
let animationId = null

onMounted(() => {
  if (!noiseCanvas.value) return

  const canvas = noiseCanvas.value
  const ctx = canvas.getContext('2d')

  // 设置canvas尺寸
  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // 生成噪点动画
  const generateNoise = () => {
    const imageData = ctx.createImageData(canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 255
      data[i] = noise      // R
      data[i + 1] = noise  // G
      data[i + 2] = noise  // B
      data[i + 3] = 8      // A - 非常低的透明度，保持微妙
    }

    ctx.putImageData(imageData, 0, 0)
    animationId = requestAnimationFrame(generateNoise)
  }

  generateNoise()

  onUnmounted(() => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    window.removeEventListener('resize', resize)
  })
})
</script>

<style scoped>
.retro-effects {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: overlay;
}

/* 噪点层 */
.noise-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.03;
  animation: noiseFlicker 0.1s infinite;
}

@keyframes noiseFlicker {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.04; }
}

/* 扫描线效果 */
.scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.05) 0px,
    rgba(0, 0, 0, 0.05) 1px,
    transparent 1px,
    transparent 2px
  );
  animation: scanlineMove 8s linear infinite;
  opacity: 0.3;
}

@keyframes scanlineMove {
  0% { transform: translateY(0); }
  100% { transform: translateY(4px); }
}

/* 晕影效果 */
.vignette {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    transparent 60%,
    rgba(0, 0, 0, 0.3) 100%
  );
  opacity: 0.5;
}
</style>
