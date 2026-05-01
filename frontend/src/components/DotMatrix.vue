<template>
  <canvas ref="canvas" class="dot-matrix"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)

onMounted(() => {
  const ctx = canvas.value.getContext('2d')
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight

  const dotSpacing = 30
  const dotRadius = 1.5
  const dotColor = 'rgba(0, 255, 136, 0.3)'

  const drawDots = () => {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

    for (let x = 0; x < canvas.value.width; x += dotSpacing) {
      for (let y = 0; y < canvas.value.height; y += dotSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      }
    }
  }

  drawDots()

  const handleResize = () => {
    canvas.value.width = window.innerWidth
    canvas.value.height = window.innerHeight
    drawDots()
  }

  window.addEventListener('resize', handleResize)

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<style scoped>
.dot-matrix {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.15;
}
</style>
