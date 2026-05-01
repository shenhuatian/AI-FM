<template>
  <div class="status-section">
    <div class="status-indicator">
      <span class="status-dot"></span>
      <span class="status-text">Claudio</span>
    </div>
    <div class="live-badge">LIVE</div>
    <div class="timestamp">{{ currentTime }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentTime = ref('00:00')
let intervalId = null

const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
}

onMounted(() => {
  updateTime()
  intervalId = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.status-section { flex-shrink: 0; position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #222; }
.status-indicator { display: flex; align-items: center; gap: 8px; }
.status-dot { width: 8px; height: 8px; background: #00ff88; border-radius: 50%; animation: blink 2s ease-in-out infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.status-text { font-size: 14px; color: #fff; font-family: 'Courier New', monospace; }
.live-badge { font-size: 11px; color: #fff; font-weight: 600; letter-spacing: 1px; font-family: 'Courier New', monospace; }
.timestamp { font-size: 12px; color: #888; font-family: 'Courier New', monospace; }
</style>
