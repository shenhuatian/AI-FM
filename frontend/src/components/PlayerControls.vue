<template>
  <div class="player-controls">
    <button class="control-btn" @click="$emit('previous')" title="上一首">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 4l10 8-10 8V4z"/><path d="M19 5v14"/>
      </svg>
    </button>
    <button class="control-btn" @click="$emit('stop')" title="停止">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="6" width="12" height="12"/>
      </svg>
    </button>
    <button class="control-btn" :class="{ liked: isLiked }" @click="$emit('like')" title="喜欢">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
</template>

<script setup>
defineProps({ isPlaying: Boolean, isLiked: Boolean, volume: Number })
defineEmits(['play', 'previous', 'next', 'stop', 'like', 'volume-change', 'show-playlist', 'show-favorites'])
</script>

<style scoped>
.player-controls { flex-shrink: 0; position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 24px 16px; border-bottom: 1px solid #222; flex-wrap: wrap; }
.control-btn { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: 2px solid #333; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
.control-btn:hover { border-color: #fff; background: rgba(255, 255, 255, 0.05); }
.control-btn:active { transform: scale(0.95); }
.control-btn.play-pause-btn { width: 48px; height: 48px; border-color: #fff; }
.control-btn.text-btn { width: auto; padding: 0 16px; border-radius: 24px; font-size: 11px; font-weight: 600; letter-spacing: 1px; font-family: 'Courier New', monospace; }
.control-btn.liked { border-color: #00ff88; color: #00ff88; }
.volume-control { display: flex; align-items: center; gap: 8px; margin-left: 12px; }
.volume-label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 1px; font-family: 'Courier New', monospace; }
.volume-slider { width: 100px; height: 4px; background: #333; border-radius: 2px; outline: none; -webkit-appearance: none; cursor: pointer; }
.volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: #fff; border-radius: 50%; cursor: pointer; transition: all 0.2s; }
.volume-slider::-webkit-slider-thumb:hover { background: #00ff88; transform: scale(1.2); }
@media (max-width: 480px) {
  .player-controls { gap: 6px; }
  .volume-control { width: 100%; margin-left: 0; margin-top: 8px; justify-content: center; }
}
</style>
