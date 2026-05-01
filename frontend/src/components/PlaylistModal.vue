<template>
  <div class="playlist-modal" @click.self="$emit('close')">
    <div class="playlist-content">
      <div class="playlist-header">
        <div class="playlist-title">PLAYLIST</div>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="playlist-items">
        <div v-if="playlist.length === 0" class="empty-message">暂无播放列表</div>
        <div
          v-for="(song, index) in playlist"
          :key="index"
          class="playlist-item"
          :class="{ active: index === currentIndex }"
          @click="$emit('play', index)"
        >
          <div class="album-cover">
            <img v-if="song.albumPic" :src="song.albumPic" :alt="song.name" />
            <div v-else class="default-cover">🎵</div>
          </div>
          <div class="song-info">
            <div class="song-name">{{ song.name }}</div>
            <div class="song-artist">{{ song.artist }}</div>
          </div>
          <div v-if="index === currentIndex" class="playing-indicator">▶</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ playlist: Array, currentIndex: Number })
defineEmits(['close', 'play'])
</script>

<style scoped>
.playlist-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.playlist-content {
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #222;
  background: #000;
}

.playlist-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 32px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.playlist-items {
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.empty-message {
  padding: 40px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 4px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  gap: 12px;
}

.playlist-item:hover {
  background: #1a1a1a;
}

.playlist-item.active {
  background: #1a1a1a;
  border-left: 3px solid #00ff88;
}

.album-cover {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-cover {
  font-size: 24px;
  color: #666;
}

.song-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.song-name {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  color: #888;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playing-indicator {
  color: #00ff88;
  font-size: 12px;
  flex-shrink: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.playlist-items::-webkit-scrollbar {
  width: 6px;
}

.playlist-items::-webkit-scrollbar-track {
  background: #0a0a0a;
}

.playlist-items::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.playlist-items::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>
