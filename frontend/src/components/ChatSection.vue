<template>
  <div class="chat-section" ref="chatSection">
    <div class="chat-messages" ref="chatMessages">
      <div v-for="(msg, index) in props.messages" :key="msg.id || `msg-${index}`" class="message" :class="[msg.type, { proactive: msg.isProactive }]">
        <div class="message-header">
          <div class="message-avatar">
            <img v-if="msg.type === 'dj' && djAvatarUrl" :src="djAvatarUrl" class="avatar-img" />
            <span v-else>{{ msg.type === 'user' ? '👤' : '🎵' }}</span>
          </div>
          <div class="message-sender">{{ msg.type === 'user' ? 'YOU' : 'CLAUDIO' }}</div>
        </div>
        <div class="message-content">{{ msg.text }}</div>

        <!-- 歌曲列表 -->
        <div v-if="msg.songs && msg.songs.length > 0" class="song-list">
          <SongCard
            v-for="(song, songIndex) in msg.songs"
            :key="song.id || songIndex"
            :song="song"
            :isBestRecommendation="songIndex === 0"
            :isPlaying="currentPlayingSongId === song.id"
            @play="$emit('play-song', index, songIndex)"
          />
        </div>

        <!-- 反馈按钮（仅显示在有推荐理由的消息上，且对当前播放的歌曲生效） -->
        <div v-if="msg.type === 'dj' && msg.reason && msg.songs && msg.songs.length > 0 && hasCurrentPlayingSong(msg.songs)" class="feedback-actions">
          <button
            class="feedback-btn like"
            :class="{ active: getSongFeedback(getCurrentPlayingSong(msg.songs)?.id) === 'like' }"
            @click="handleFeedback(getCurrentPlayingSong(msg.songs), 'like')"
          >
            <span class="icon">👍</span>
            <span class="label">喜欢</span>
          </button>
          <button
            class="feedback-btn dislike"
            :class="{ active: getSongFeedback(getCurrentPlayingSong(msg.songs)?.id) === 'dislike' }"
            @click="handleFeedback(getCurrentPlayingSong(msg.songs), 'dislike')"
          >
            <span class="icon">👎</span>
            <span class="label">不喜欢</span>
          </button>
          <button
            class="feedback-btn favorite"
            :class="{ active: isSongFavorited(getCurrentPlayingSong(msg.songs)?.id) }"
            @click="handleToggleFavorite(getCurrentPlayingSong(msg.songs))"
          >
            <span class="icon">{{ isSongFavorited(getCurrentPlayingSong(msg.songs)?.id) ? '⭐' : '☆' }}</span>
            <span class="label">收藏</span>
          </button>
        </div>

        <div class="message-time">{{ msg.time }}</div>
      </div>
    </div>

    <!-- 新消息提示按钮 -->
    <transition name="fade-bounce">
      <button v-if="showNewMessageButton" class="new-message-btn" @click="scrollToBottom">
        <span class="arrow">↓</span>
        <span class="text">新消息</span>
      </button>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, computed } from 'vue'
import { getAvatar } from '../utils/avatar.js'
import { getFeedback, setFeedback, removeFeedback } from '../utils/feedback.js'
import { isFavorited, toggleFavorite } from '../utils/favorites.js'
import SongCard from './SongCard.vue'

const props = defineProps({ messages: Array, currentPlayingSongId: String })
defineEmits(['play-song'])

const chatSection = ref(null)
const chatMessages = ref(null)
const showNewMessageButton = ref(false)
const isUserAtBottom = ref(true)
const scrollContainer = ref(null)
const djAvatarUrl = ref('')
const songFeedbacks = ref({})
const songFavorites = ref({})

onMounted(() => {
  // 找到真正的滚动容器（最外层的 app-container）
  let element = chatSection.value
  while (element && element.parentElement) {
    if (element.parentElement.classList.contains('app-container')) {
      scrollContainer.value = element.parentElement
      break
    }
    element = element.parentElement
  }

  // 监听滚动容器的滚动事件
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll)
  }

  // 加载 DJ 头像
  djAvatarUrl.value = getAvatar()

  // 监听头像更新事件
  window.addEventListener('avatar-updated', () => {
    djAvatarUrl.value = getAvatar()
  })

  // 监听收藏更新事件
  window.addEventListener('favorites-updated', () => {
    songFavorites.value = { ...songFavorites.value }
  })
})

// 获取歌曲反馈
const getSongFeedback = (songId) => {
  if (!songId) return null
  return getFeedback(songId)
}

// 检查歌曲是否已收藏
const isSongFavorited = (songId) => {
  if (!songId) return false
  return isFavorited(songId)
}

// 处理反馈
const handleFeedback = (song, feedback) => {
  if (!song) return
  const currentFeedback = getFeedback(song.id)
  if (currentFeedback === feedback) {
    removeFeedback(song.id)
  } else {
    setFeedback(song.id, song.name, song.artist, feedback)
  }
  songFeedbacks.value = { ...songFeedbacks.value }
}

// 处理收藏切换
const handleToggleFavorite = (song) => {
  if (!song) return
  toggleFavorite(song)
  songFavorites.value = { ...songFavorites.value }
}

// 检查歌曲列表中是否包含当前播放的歌曲
const hasCurrentPlayingSong = (songs) => {
  if (!props.currentPlayingSongId || !songs) return false
  return songs.some(song => song.id === props.currentPlayingSongId)
}

// 获取当前播放的歌曲
const getCurrentPlayingSong = (songs) => {
  if (!props.currentPlayingSongId || !songs) return null
  return songs.find(song => song.id === props.currentPlayingSongId)
}

// 检查用户是否在底部附近（距离底部小于150px）
const checkIfAtBottom = () => {
  if (!scrollContainer.value) {
    return true
  }
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight
  const isAtBottom = distanceFromBottom < 150

  return isAtBottom
}

// 处理滚动事件
const handleScroll = () => {
  isUserAtBottom.value = checkIfAtBottom()

  // 如果用户滚动到底部，隐藏新消息按钮
  if (isUserAtBottom.value) {
    showNewMessageButton.value = false
  }
}

// 滚动到底部
const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (scrollContainer.value) {
      const scrollHeight = scrollContainer.value.scrollHeight
      const clientHeight = scrollContainer.value.clientHeight
      const targetScroll = scrollHeight - clientHeight

      scrollContainer.value.scrollTo({
        top: targetScroll,
        behavior: smooth ? 'smooth' : 'auto'
      })

      // 滚动后立即更新状态
      setTimeout(() => {
        isUserAtBottom.value = true
        showNewMessageButton.value = false
      }, smooth ? 300 : 0)
    }
  })
}

// 监听消息变化
watch(() => props.messages, (newMessages, oldMessages) => {
  try {
    console.log('🔥 [测试] ChatSection watch 触发')
    console.log('🔥 [测试] 新消息数量:', newMessages?.length)
    console.log('🔥 [测试] 旧消息数量:', oldMessages?.length)

    if (!newMessages || newMessages.length === 0) {
      console.log('🔥 [测试] 消息为空，退出')
      return
    }

    // 获取最新消息
    const latestMessage = newMessages[newMessages.length - 1]
    console.log('🔥 [测试] 最新消息:', latestMessage)

    // 只要数组引用变化或长度变化，就认为是新消息
    const isNewMessage = !oldMessages ||
                         newMessages.length !== oldMessages.length ||
                         newMessages !== oldMessages

    console.log('🔥 [测试] 是否是新消息:', isNewMessage)

    if (!isNewMessage) {
      console.log('🔥 [测试] 不是新消息，退出')
      return
    }

    console.log('🔥 [测试] 准备更新 DOM...')

    // 使用 nextTick 异步处理 DOM 更新和滚动
    nextTick(() => {
      console.log('🔥 [测试] nextTick 回调执行')
      // 再次等待，确保消息已经渲染
      setTimeout(() => {
        console.log('🔥 [测试] 消息已渲染')
        // 判断是用户消息还是AI消息
        if (latestMessage.type === 'user') {
          isUserAtBottom.value = true
          scrollToBottom(true)
        } else if (latestMessage.type === 'dj') {
          // 如果是主动消息，强制滚动到底部（不管用户位置）
          if (latestMessage.isProactive) {
            console.log('🔥 [测试] 主动消息，强制滚动')
            isUserAtBottom.value = true
            scrollToBottom(true)
          } else {
            // 普通 DJ 消息，检查用户位置
            const currentlyAtBottom = checkIfAtBottom()

            if (currentlyAtBottom) {
              scrollToBottom(true)
            } else {
              showNewMessageButton.value = true
            }
          }
        }
      }, 50)
    })
  } catch (error) {
    console.error('❌ ChatSection watch 错误:', error)
  }
}, { deep: true, flush: 'post' })

// 暴露方法给父组件
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
.chat-section {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 16px;
  min-height: 300px;
  /* 移除 overflow-y: auto，让父容器 chat-container 处理滚动 */
}

.chat-messages { display: flex; flex-direction: column; gap: 16px; }

.message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: messageSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0;
  animation-fill-mode: forwards;
  position: relative;
}

/* 主动消息特殊样式 */
.message.proactive {
  animation: proactiveMessageIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation-fill-mode: forwards;
  opacity: 0;
}

.message.proactive .message-content {
  background: rgba(0, 255, 136, 0.08);
  border-color: rgba(0, 255, 136, 0.4);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
}

.message.proactive .message-avatar {
  animation: avatarPulse 2s ease-in-out infinite;
  border-color: #00ff88;
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
}

@keyframes proactiveMessageIn {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  50% {
    transform: translateY(-5px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes avatarPulse {
  0%, 100% {
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
  }
  50% {
    box-shadow: 0 0 25px rgba(0, 255, 136, 0.8);
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-header { display: flex; align-items: center; gap: 8px; }
.message-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; background: #1a1a1a; border: 1px solid #333; overflow: hidden; }
.message-avatar .avatar-img { width: 100%; height: 100%; object-fit: cover; }
.message-sender { font-size: 12px; color: #888; text-transform: uppercase; font-family: 'Courier New', monospace; }
.message-content {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 12px 16px;
  font-size: 14px;
  color: #ccc;
  margin-left: 40px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.message-content:hover {
  background: #222;
  border-color: #444;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.message.user .message-content { background: rgba(0, 255, 136, 0.1); border-color: rgba(0, 255, 136, 0.3); color: #fff; margin-left: 0; margin-right: 40px; }
.message.user { align-items: flex-end; }
.message-time { font-size: 11px; color: #666; font-family: 'Courier New', monospace; margin-left: 40px; }
.message.user .message-time { margin-left: 0; margin-right: 40px; }

/* 歌曲列表 */
.song-list {
  margin-top: 12px;
  margin-left: 40px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.message.user .song-list {
  margin-left: 0;
  margin-right: 40px;
}

/* 反馈按钮 */
.feedback-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  margin-left: 40px;
}

.message.user .feedback-actions {
  margin-left: 0;
  margin-right: 40px;
}

.feedback-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Courier New', monospace;
}

.feedback-btn .icon {
  font-size: 14px;
}

.feedback-btn .label {
  font-size: 11px;
}

.feedback-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(0, 255, 136, 0.5);
  color: #fff;
  transform: translateY(-1px);
}

.feedback-btn.active {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
  color: #00ff88;
}

.feedback-btn.like.active {
  background: rgba(0, 255, 136, 0.2);
}

.feedback-btn.dislike.active {
  background: rgba(255, 100, 100, 0.2);
  border-color: #ff6464;
  color: #ff6464;
}

.feedback-btn.favorite.active {
  background: rgba(255, 200, 0, 0.2);
  border-color: #ffc800;
  color: #ffc800;
}

/* 新消息按钮 */
.new-message-btn {
  position: fixed;
  bottom: 100px;
  right: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--mood-accent, #00ff88);
  border: none;
  border-radius: 50%;
  color: #000;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.4);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1000;
}

.new-message-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 255, 136, 0.6);
}

.new-message-btn:active {
  transform: scale(0.95);
}

.new-message-btn .arrow {
  font-size: 18px;
  line-height: 1;
  margin-bottom: 2px;
}

.new-message-btn .text {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}

/* 淡入弹跳动画 */
.fade-bounce-enter-active {
  animation: fadeBounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-bounce-leave-active {
  animation: fadeBounceOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeBounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(20px);
  }
  50% {
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes fadeBounceOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}
</style>
