<template>
  <div class="progress-section">
    <div class="progress-time">
      <span>{{ formatTime(currentTime) }}</span>
      <span>{{ formatTime(duration) }}</span>
    </div>
    <div class="progress-bar" @click="handleSeek">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ currentTime: Number, duration: Number })
const emit = defineEmits(['seek'])

const progress = computed(() => {
  if (!props.duration) return 0
  return (props.currentTime / props.duration) * 100
})

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const handleSeek = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = ((e.clientX - rect.left) / rect.width) * 100
  emit('seek', percent)
}
</script>

<style scoped>
.progress-section { flex-shrink: 0; position: relative; z-index: 1; padding: 16px; border-bottom: 1px solid #222; }
.progress-time { display: flex; justify-content: space-between; font-size: 12px; color: #888; font-family: 'Courier New', monospace; margin-bottom: 8px; }
.progress-bar { width: 100%; height: 4px; background: #333; border-radius: 2px; cursor: pointer; position: relative; overflow: hidden; }
.progress-fill { height: 100%; background: #fff; transition: width 0.1s linear; position: relative; }
.progress-fill::after { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; background: #fff; border-radius: 50%; }
</style>
