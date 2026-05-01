<template>
  <canvas ref="canvas" class="starry-background"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)
let animationId = null

onMounted(() => {
  const ctx = canvas.value.getContext('2d')
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight

  const stars = []
  const starCount = 200

  // 创建星星
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.value.width,
      y: Math.random() * canvas.value.height,
      radius: Math.random() * 1.5,
      opacity: Math.random(),
      speed: Math.random() * 0.5
    })
  }

  // 动画循环
  const animate = () => {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

    stars.forEach(star => {
      // 闪烁效果
      star.opacity += star.speed * 0.02
      if (star.opacity > 1 || star.opacity < 0) {
        star.speed = -star.speed
      }

      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
      ctx.fill()
    })

    animationId = requestAnimationFrame(animate)
  }

  animate()

  // 窗口大小改变时重绘
  const handleResize = () => {
    canvas.value.width = window.innerWidth
    canvas.value.height = window.innerHeight
  }

  window.addEventListener('resize', handleResize)

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })
})
</script>

<style scoped>
.starry-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.6;
}
</style>
