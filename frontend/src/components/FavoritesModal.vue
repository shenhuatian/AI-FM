<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">我的收藏</h2>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="favorites-list">
          <div v-if="favorites.length === 0" class="empty-state">
            <div class="empty-icon">☆</div>
            <div class="empty-text">还没有收藏任何歌曲</div>
          </div>

          <div v-else>
            <div
              v-for="(song, index) in favorites"
              :key="song.id"
              class="favorite-item"
              :class="{ playing: currentPlayingSongId === song.id }"
            >
              <div class="song-info" @click="$emit('play', song)">
                <div class="play-icon">▶</div>
                <div class="song-details">
                  <div class="song-name">{{ song.name }}</div>
                  <div class="song-artist">{{ song.artist }}</div>
                  <div class="song-date">收藏于 {{ formatDate(song.addedAt) }}</div>
                </div>
              </div>
              <button class="remove-btn" @click="handleRemove(song.id)" title="移除收藏">
                ×
              </button>
            </div>
          </div>
        </div>

        <div v-if="favorites.length > 0" class="modal-footer">
          <button class="clear-btn" @click="handleClearAll">
            清空收藏夹
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getAllFavorites, removeFavorite, clearAllFavorites } from '../utils/favorites.js'

const props = defineProps({
  isOpen: Boolean,
  currentPlayingSongId: String
})

const emit = defineEmits(['close', 'play'])

const favorites = ref([])

// 加载收藏列表（优先从后端）
const loadFavorites = async () => {
  // 先显示本地数据（快速响应）
  favorites.value = getAllFavorites()

  // 然后从后端加载最新数据
  try {
    const response = await fetch('/api/favorites')
    if (response.ok) {
      const data = await response.json()
      const backendFavorites = data.favorites || []

      // 更新显示
      favorites.value = backendFavorites

      // 同步到 localStorage
      localStorage.setItem('song_favorites', JSON.stringify(backendFavorites))
    }
  } catch (error) {
    console.warn('从后端加载收藏失败，使用本地数据:', error)
  }
}

// 监听弹窗打开
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadFavorites()
  }
})

// 监听收藏更新事件
window.addEventListener('favorites-updated', () => {
  loadFavorites()
})

// 移除收藏
const handleRemove = (songId) => {
  if (confirm('确定要移除这首歌吗？')) {
    removeFavorite(songId)
    loadFavorites()
  }
}

// 清空收藏夹
const handleClearAll = () => {
  if (confirm('确定要清空所有收藏吗？')) {
    clearAllFavorites()
    loadFavorites()
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.favorites-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  color: #333;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.favorite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.favorite-item:hover {
  background: #222;
  border-color: #00ff88;
  transform: translateX(4px);
}

.favorite-item.playing {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
  border-left: 4px solid #00ff88;
  padding-left: 13px;
}

.song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  cursor: pointer;
}

.play-icon {
  font-size: 14px;
  color: #888;
  transition: all 0.2s;
}

.favorite-item:hover .play-icon,
.favorite-item.playing .play-icon {
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
  margin-bottom: 2px;
}

.song-date {
  font-size: 11px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #888;
  font-size: 20px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.remove-btn:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: #ff6464;
  color: #ff6464;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
}

.clear-btn {
  padding: 8px 16px;
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 20px;
  color: #ff6464;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
}

.clear-btn:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: #ff6464;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
}
</style>
