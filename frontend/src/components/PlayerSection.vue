<template>
  <div class="player-section">
    <!-- 播放控制按钮 -->
    <div class="controls-row">
      <button class="control-btn" @click="$emit('previous')" title="上一首">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 20L9 12l10-8v16z"/><path d="M5 19V5"/>
        </svg>
      </button>
      <button class="control-btn play-pause-btn" @click="$emit('play')" title="播放/暂停">
        <svg v-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
        </svg>
      </button>
      <button class="control-btn" @click="$emit('next')" title="下一首">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 4l10 8-10 8V4z"/><path d="M19 5v14"/>
        </svg>
      </button>
      <button class="control-btn" @click="$emit('stop')" title="停止">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="6" width="12" height="12"/>
        </svg>
      </button>
      <button class="control-btn" :class="{ liked: isLiked }" @click="$emit('like')" title="喜欢">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button class="control-btn text-btn" @click="$emit('show-playlist')" title="播放列表">LIST</button>
      <button class="control-btn text-btn" @click="$emit('show-favorites')" title="收藏">FAV</button>
      <div class="volume-control">
        <span class="volume-label">VOL</span>
        <input type="range" class="volume-slider" :value="volume" @input="$emit('volume-change', $event.target.value)" min="0" max="100">
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-row">
      <span class="time-label">{{ formatTime(currentTime) }}</span>
      <div class="progress-bar" @click="handleSeek">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="time-label">{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isPlaying: Boolean,
  isLiked: Boolean,
  volume: Number,
  currentTime: Number,
  duration: Number
})

const emit = defineEmits(['play', 'previous', 'next', 'stop', 'like', 'volume-change', 'show-playlist', 'show-favorites', 'seek'])

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
.player-section {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  padding: 16px;
  border-bottom: 1px solid #222;
  background: rgba(0, 0, 0, 0.5);
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.control-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid #333;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
  position: relative;
}

.control-btn::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: -1;
  opacity: 0;
}

.control-btn:hover {
  border-color: #fff;
  background: rgba(255, 255, 255, 0.05);
  transform: scale(1.05) translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 255, 255, 0.2);
}

.control-btn:hover::before {
  opacity: 1;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}

.control-btn:active {
  transform: scale(0.95) translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition-duration: 0.1s;
}

.control-btn.play-pause-btn {
  width: 44px;
  height: 44px;
  border-color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.control-btn.play-pause-btn:hover {
  background: rgba(0, 255, 136, 0.1);
  border-color: var(--mood-accent, #00ff88);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 20px var(--mood-accent, rgba(0, 255, 136, 0.4));
  transform: scale(1.08) translateY(-2px);
}

.control-btn.play-pause-btn:active {
  transform: scale(0.98) translateY(0);
}

.control-btn.text-btn {
  width: auto;
  padding: 0 12px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}

.control-btn.liked {
  border-color: #00ff88;
  color: #00ff88;
  background: rgba(0, 255, 136, 0.1);
  animation: heartbeat 1.5s ease-in-out;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  10% { transform: scale(1.2); }
  20% { transform: scale(1); }
  30% { transform: scale(1.15); }
  40% { transform: scale(1); }
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.volume-label {
  font-size: 10px;
  color: #888;
  font-weight: 600;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}

.volume-slider {
  width: 80px;
  height: 3px;
  background: #333;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.volume-slider::-webkit-slider-thumb:hover {
  background: var(--mood-accent, #00ff88);
  transform: scale(1.2);
  box-shadow: 0 0 8px var(--mood-accent, #00ff88);
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-label {
  font-size: 11px;
  color: #888;
  font-family: 'Courier New', monospace;
  min-width: 35px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #333;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--mood-accent, #00ff88), var(--mood-accent, #00cc66));
  transition: width 0.1s linear, background 1s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 8px var(--mood-accent, #00ff88);
}

@media (max-width: 480px) {
  .controls-row {
    gap: 4px;
  }

  .control-btn {
    width: 32px;
    height: 32px;
  }

  .control-btn.play-pause-btn {
    width: 40px;
    height: 40px;
  }

  .volume-control {
    width: 100%;
    margin-left: 0;
    margin-top: 8px;
    justify-content: center;
  }

  .volume-slider {
    width: 120px;
  }
}
</style>
