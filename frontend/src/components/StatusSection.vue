<template>
  <div class="status-section">
    <div class="status-left">
      <div class="mini-avatar" :style="avatarStyle"></div>
      <span class="brand-name">Claudio</span>
      <span class="status-indicator">
        <span class="status-dot"></span>
        <span class="status-text">LIVE</span>
      </span>
    </div>
    <div class="status-right">
      <button class="action-btn" @click="clearChatOnly" title="清除聊天记录">
        <span class="icon">💬</span>
      </button>
      <button class="action-btn danger" @click="clearAllData" title="重置所有数据">
        <span class="icon">🗑️</span>
      </button>
      <span class="time-text">{{ currentTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getAvatar } from '../utils/avatar.js'
import storage from '../utils/storage.js'

const currentTime = ref('00:00')
const avatarUrl = ref('')
let intervalId = null

const avatarStyle = computed(() => {
  if (avatarUrl.value) {
    return {
      backgroundImage: `url(${avatarUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
})

const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
}

const clearChatOnly = () => {
  if (confirm('确定要清除所有聊天记录吗？\n\n你的音乐偏好、播放历史和收藏不会被清除。')) {
    storage.clearMessages()
    window.location.reload()
  }
}

const clearAllData = () => {
  if (confirm('⚠️ 确定要重置所有数据吗？\n\n这将清除：\n- 聊天记录\n- 播放历史\n- 反馈记录\n- 收藏夹\n\nAI 将完全忘记你的偏好，此操作不可恢复！')) {
    localStorage.clear()
    window.location.reload()
  }
}

onMounted(() => {
  updateTime()
  intervalId = setInterval(updateTime, 1000)
  avatarUrl.value = getAvatar()

  window.addEventListener('avatar-updated', () => {
    avatarUrl.value = getAvatar()
  })
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.status-section {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #222;
  background: rgba(0, 0, 0, 0.8);
  font-family: 'Courier New', monospace;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mini-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #00ff88;
  cursor: pointer;
}

.brand-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00ff88;
  animation: pulse 2s ease-in-out infinite;
}

.status-text {
  font-size: 11px;
  font-weight: 600;
  color: #00ff88;
  letter-spacing: 1px;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.action-btn:hover {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
  transform: translateY(-1px);
}

.action-btn.danger:hover {
  background: rgba(255, 100, 100, 0.1);
  border-color: #ff6464;
}

.time-text {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2px;
  margin-left: 8px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
