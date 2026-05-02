<template>
  <div
    class="song-card"
    :class="{
      'best-recommendation': isBestRecommendation,
      'playing': isPlaying,
      'hovered': isHovered
    }"
    @click="$emit('play')"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="song-info">
      <div class="play-icon">▶</div>
      <div class="song-details">
        <div class="song-name">{{ song.name }}</div>
        <div class="song-artist">{{ song.artist }}</div>
      </div>
    </div>
    <div v-if="isPlaying" class="playing-indicator">
      <div class="wave-bar"></div>
      <div class="wave-bar"></div>
      <div class="wave-bar"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  song: {
    type: Object,
    required: true
  },
  isBestRecommendation: {
    type: Boolean,
    default: false
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
})

defineEmits(['play'])

const isHovered = ref(false)
</script>

<style scoped>
.song-card {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.song-card:hover {
  background: #222;
  border-color: #00ff88;
  transform: translateX(4px);
  box-shadow: -4px 0 0 #00ff88;
}

.song-card.playing {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
  border-left: 4px solid #00ff88;
  padding-left: 13px;
}

.song-card.best-recommendation {
  background: linear-gradient(
    90deg,
    rgba(0, 255, 136, 0.15) 0%,
    rgba(0, 255, 136, 0.05) 10%,
    #1a1a1a 20%
  );
  border: 1px solid rgba(0, 255, 136, 0.5);
  border-left: 4px solid #00ff88;
  padding-left: 13px;
  box-shadow:
    -4px 0 12px rgba(0, 255, 136, 0.3),
    0 0 20px rgba(0, 255, 136, 0.1);
  position: relative;
}

.song-card.best-recommendation::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(
    180deg,
    #00ff88 0%,
    #00cc66 50%,
    #00ff88 100%
  );
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.play-icon {
  font-size: 14px;
  color: #888;
  transition: all 0.2s;
}

.song-card:hover .play-icon,
.song-card.playing .play-icon {
  color: #00ff88;
  transform: scale(1.2);
}

.song-details {
  flex: 1;
}

.song-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  font-family: 'Courier New', monospace;
}

.song-artist {
  font-size: 12px;
  color: #888;
  font-family: 'Courier New', monospace;
}

.playing-indicator {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 16px;
}

.wave-bar {
  width: 3px;
  background: #00ff88;
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(1) {
  animation-delay: 0s;
}

.wave-bar:nth-child(2) {
  animation-delay: 0.2s;
}

.wave-bar:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes wave {
  0%, 100% {
    height: 4px;
  }
  50% {
    height: 16px;
  }
}
</style>
