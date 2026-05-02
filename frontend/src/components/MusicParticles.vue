<template>
  <canvas ref="particleCanvas" class="particle-system"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const particleCanvas = ref(null)
let animationId = null
let particles = []

class MusicNote {
  constructor(canvas) {
    this.canvas = canvas
    this.reset()
  }

  reset() {
    this.x = Math.random() * this.canvas.width
    this.y = this.canvas.height + 20
    this.size = Math.random() * 12 + 8
    this.speedY = -(Math.random() * 0.5 + 0.3)
    this.speedX = (Math.random() - 0.5) * 0.3
    this.opacity = Math.random() * 0.3 + 0.1
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 0.02
    this.symbol = ['♪', '♫', '♬'][Math.floor(Math.random() * 3)]
  }

  update() {
    this.y += this.speedY
    this.x += this.speedX
    this.rotation += this.rotationSpeed

    // 如果粒子移出屏幕，重置
    if (this.y < -50) {
      this.reset()
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.globalAlpha = this.opacity
    ctx.fillStyle = '#00ff88'
    ctx.font = `${this.size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.symbol, 0, 0)
    ctx.restore()
  }
}

onMounted(() => {
  if (!particleCanvas.value) return

  const canvas = particleCanvas.value
  const ctx = canvas.getContext('2d')

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // 创建少量粒子（非常克制）
  const particleCount = 8
  for (let i = 0; i < particleCount; i++) {
    particles.push(new MusicNote(canvas))
    // 初始化时随机分布在屏幕上
    particles[i].y = Math.random() * canvas.height
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach(particle => {
      particle.update()
      particle.draw(ctx)
    })

    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    window.removeEventListener('resize', resize)
    particles = []
  })
})
</script>

<style scoped>
.particle-system {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  opacity: 0.4;
}
</style>
