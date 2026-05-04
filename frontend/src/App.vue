<script setup>
import { ref, onMounted } from 'vue'
import StarryBackground from './components/StarryBackground.vue'
import DotMatrix from './components/DotMatrix.vue'
import AmbienceLight from './components/AmbienceLight.vue'
import RetroEffects from './components/RetroEffects.vue'
import MusicParticles from './components/MusicParticles.vue'
import PixelClock from './components/PixelClock.vue'
import SongPoemSection from './components/SongPoemSection.vue'
import PlayerSection from './components/PlayerSection.vue'
import StatusSection from './components/StatusSection.vue'
import ChatSection from './components/ChatSection.vue'
import InputSection from './components/InputSection.vue'
import PlaylistModal from './components/PlaylistModal.vue'
import DJProfile from './components/DJProfile.vue'
import FavoritesModal from './components/FavoritesModal.vue'
import ConfigModal from './components/ConfigModal.vue'
import storage from './utils/storage.js'

const audioPlayer = ref(null)
const appContainer = ref(null)
const currentSong = ref({ name: 'Waiting...', artist: 'Select a song' })
const currentPoem = ref('诗歌将在播放音乐时生成...')
const isPlaying = ref(false)
const isLiked = ref(false)
const volume = ref(80)
const currentTime = ref(0)
const duration = ref(0)
const currentPlaylist = ref([])
const currentIndex = ref(0)
const messages = ref([])
const showPlaylistModal = ref(false)
const isPoemCollapsed = ref(false)
const isSticky = ref(false)
const showDJProfile = ref(false)
const currentPlayingSongId = ref(null)
const showFavoritesModal = ref(false)
const showConfigModal = ref(false)

onMounted(() => {
    console.log('🎵 Claudio FM - Vue 3')

    const savedMessages = storage.getAllMessages()
    if (savedMessages.length > 0) {
      messages.value = savedMessages
      console.log('📦 恢复了', savedMessages.length, '条历史消息')
    } else {
      addDJMessage('嗨！我是Claudio，你的AI音乐DJ 🎵')
    }

    const { playlist, currentIndex: savedIndex } = storage.getPlaylist()
    if (playlist.length > 0) {
      currentPlaylist.value = playlist
      currentIndex.value = savedIndex
      console.log('📦 恢复了播放列表，共', playlist.length, '首歌')
    }

    if (audioPlayer.value) audioPlayer.value.volume = volume.value / 100

    // 🔥 连接 WebSocket 接收主动消息
    connectWebSocket()
  })

const togglePlay = () => {
  if (!audioPlayer.value?.src) { addDJMessage('还没有歌曲哦 😊'); return }
  if (isPlaying.value) { audioPlayer.value.pause(); isPlaying.value = false }
  else { audioPlayer.value.play(); isPlaying.value = true }
}

const skipPrevious = () => {
  if (currentPlaylist.value.length === 0) { addDJMessage('播放列表是空的 🎵'); return }
  currentIndex.value = (currentIndex.value - 1 + currentPlaylist.value.length) % currentPlaylist.value.length
  playSong(currentPlaylist.value[currentIndex.value])
}

const skipNext = () => {
  if (currentPlaylist.value.length === 0) { addDJMessage('播放列表是空的 🎵'); return }
  currentIndex.value = (currentIndex.value + 1) % currentPlaylist.value.length
  playSong(currentPlaylist.value[currentIndex.value])
}

const stopPlayback = () => {
  if (audioPlayer.value) { audioPlayer.value.pause(); audioPlayer.value.currentTime = 0; isPlaying.value = false }
}

const toggleLike = () => {
  isLiked.value = !isLiked.value
  if (isLiked.value && currentPlaylist.value[currentIndex.value]) {
    const song = currentPlaylist.value[currentIndex.value]
    fetch('/api/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId: song.id, songName: song.name, artist: song.artist }) }).catch(err => console.error(err))
  }
}

const changeVolume = (value) => { volume.value = value; if (audioPlayer.value) audioPlayer.value.volume = value / 100 }

const playSong = async (song) => {
  if (!song?.url) { addDJMessage('抱歉，无法播放这首歌'); return }
  console.log('🎵 播放:', song.name)

  // 更新当前播放歌曲 ID
  currentPlayingSongId.value = song.id

  // 添加淡出效果
  if (audioPlayer.value && isPlaying.value) {
    const fadeOutDuration = 500
    const startVolume = audioPlayer.value.volume
    const fadeOutInterval = 50
    const volumeStep = startVolume / (fadeOutDuration / fadeOutInterval)

    const fadeOut = setInterval(() => {
      if (audioPlayer.value.volume > volumeStep) {
        audioPlayer.value.volume -= volumeStep
      } else {
        audioPlayer.value.volume = 0
        audioPlayer.value.pause()
        clearInterval(fadeOut)

        // 切换歌曲
        currentSong.value = song
        generatePoem(song)
        audioPlayer.value.src = song.url
        audioPlayer.value.volume = volume.value / 100

        // 淡入新歌曲
        audioPlayer.value.play().then(() => {
          isPlaying.value = true
        }).catch(() => {
          addDJMessage('播放出错')
          skipNext()
        })
      }
    }, fadeOutInterval)
  } else {
    // 如果没有正在播放的歌曲，直接播放
    currentSong.value = song
    await generatePoem(song)
    audioPlayer.value.src = song.url
    audioPlayer.value.play().then(() => { isPlaying.value = true }).catch(() => { addDJMessage('播放出错'); skipNext() })
  }
}

const playSongByIndex = (index) => {
    if (currentPlaylist.value[index]) {
      currentIndex.value = index
      playSong(currentPlaylist.value[index])
      storage.savePlaylist(currentPlaylist.value, currentIndex.value)
    }
  }

const playSongFromChat = (messageIndex, songIndex) => {
  const message = messages.value[messageIndex]
  if (message && message.songs && message.songs[songIndex]) {
    const song = message.songs[songIndex]
    playSong(song)
  }
}

const generatePoem = async (song) => {
  currentPoem.value = '正在生成诗歌...'
  try {
    const response = await fetch('/api/generate-poem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songName: song.name, artist: song.artist }) })
    const data = await response.json()
    currentPoem.value = data.poem || generateLocalPoem(song)
  } catch (error) { currentPoem.value = generateLocalPoem(song) }
}

const generateLocalPoem = (song) => {
  const templates = [
    `旋律如${song.name}般流淌\n${song.artist}的声音在耳边回响\n音符跳跃，情感飞扬\n这一刻，只有音乐与心灵对话`,
    `听${song.name}\n感受${song.artist}的情感\n每个音符都是一个故事\n每段旋律都是一次旅行`
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

const updateProgress = () => { if (audioPlayer.value) { currentTime.value = audioPlayer.value.currentTime; duration.value = audioPlayer.value.duration || 0 } }
const seekTo = (percent) => { if (audioPlayer.value && duration.value) audioPlayer.value.currentTime = (percent / 100) * duration.value }
const onSongEnded = () => { skipNext() }
const onPlayError = () => { addDJMessage('播放出错 🔄'); skipNext() }

const chatSectionRef = ref(null)

const sendMessage = async (message) => {
  if (!message.trim()) return
  addUserMessage(message)
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
    const data = await response.json()
    if (data.say) addDJMessage(data.say, data.songs, data.reason)
    if (data.songs?.length > 0) {
    currentPlaylist.value = data.songs
    currentIndex.value = 0
    playSong(data.songs[0])
    storage.savePlaylist(currentPlaylist.value, currentIndex.value)
  }
  } catch (error) { addDJMessage('抱歉，出了点问题 😅') }
}

const addUserMessage = (text) => {
    messages.value = [...messages.value, { type: 'user', text, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }]
    storage.addMessage('user', text)
  }
const addDJMessage = (text, songs = null, reason = null, isProactive = false) => {
    messages.value = [...messages.value, { type: 'dj', text, songs, reason, isProactive, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }]
    storage.addMessage('dj', text, songs, reason)
    }
const showPlaylist = () => { showPlaylistModal.value = true }
const closePlaylist = () => { showPlaylistModal.value = false }
const showFavorites = () => { showFavoritesModal.value = true }
const closeFavorites = () => { showFavoritesModal.value = false }
const playFavoriteSong = (song) => { playSong(song) }
const toggleMic = () => { addDJMessage('语音输入功能开发中') }
const openDJProfile = () => { showDJProfile.value = true }
const closeDJProfile = () => { showDJProfile.value = false }
const openConfigModal = () => { showConfigModal.value = true }
const closeConfigModal = () => { showConfigModal.value = false }

const handleScroll = (e) => {
  const container = e.target
  const scrollTop = container.scrollTop

  // 获取 PixelClock 组件的高度
  const pixelClockHeight = 400

  if (scrollTop >= pixelClockHeight) {
    isSticky.value = true
  } else {
    isSticky.value = false
  }
}

// 处理吸附区域的滚动事件
const handleStickyScroll = (e) => {
  if (!isSticky.value) return

  // 检测向上滚动
  if (e.deltaY < 0) {
    // 向上滚动，解锁并返回
    const container = appContainer.value
    if (container) {
      isSticky.value = false
      // 平滑滚动回到顶部
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }
}

// 🔥 WebSocket 连接 - 接收主动消息
const connectWebSocket = () => {
  const ws = new WebSocket('ws://localhost:8080/stream')

  ws.onopen = () => {
    console.log('🔌 WebSocket 已连接')
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('📨 收到 WebSocket 消息:', data)

      if (data.type === 'proactive') {
        // AI 主动发起的消息
        console.log('🤖 收到主动消息:', data.message)

        // 添加特殊标记的 DJ 消息
        addDJMessage(data.message, data.songs, data.reason, true)

        // 如果有推荐歌曲，更新播放列表
        if (data.songs && data.songs.length > 0) {
          currentPlaylist.value = data.songs
          currentIndex.value = 0
          storage.savePlaylist(currentPlaylist.value, currentIndex.value)
        }

        // 播放提示音（可选）
        playProactiveNotification()
      }
    } catch (error) {
      console.error('处理 WebSocket 消息失败:', error)
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error)
  }

  ws.onclose = () => {
    console.log('🔌 WebSocket 已断开，5秒后重连...')
    setTimeout(connectWebSocket, 5000)
  }
}

// 播放主动消息提示音
const playProactiveNotification = () => {
  // 创建一个轻柔的提示音
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = 800
  oscillator.type = 'sine'

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.3)
}
</script>

<template>
  <div class="app-container" @scroll="handleScroll" ref="appContainer">
    <AmbienceLight :isPlaying="isPlaying" :currentSong="currentSong" />
    <StarryBackground />
    <DotMatrix />
    <MusicParticles />
    <RetroEffects />

    <!-- 可滚动区域 -->
    <div class="scrollable-content">
      <PixelClock :isPoemCollapsed="isPoemCollapsed" @update:isPoemCollapsed="isPoemCollapsed = $event" @openProfile="openDJProfile" />

      <!-- 吸附区域 -->
      <div class="sticky-section" :class="{ 'is-sticky': isSticky }" @wheel="handleStickyScroll">
        <!-- 向上渐变光晕提示 -->
        <div v-if="isSticky" class="scroll-hint"></div>

        <SongPoemSection :currentSong="currentSong" :poem="currentPoem" :isPlaying="isPlaying" :isPoemCollapsed="isPoemCollapsed" />
        <PlayerSection :isPlaying="isPlaying" :isLiked="isLiked" :volume="volume" :currentTime="currentTime" :duration="duration" @play="togglePlay" @previous="skipPrevious" @next="skipNext" @stop="stopPlayback" @like="toggleLike" @volume-change="changeVolume" @seek="seekTo" @show-playlist="showPlaylist" @show-favorites="showFavorites" />
        <StatusSection @openConfig="openConfigModal" />
      </div>

      <!-- 聊天区域 - 独立滚动 -->
      <div class="chat-container" :class="{ 'scroll-locked': isSticky }">
        <ChatSection ref="chatSectionRef" :messages="messages" :currentPlayingSongId="currentPlayingSongId" @play-song="playSongFromChat" />
      </div>
    </div>

    <!-- 输入框固定在底部 -->
    <InputSection @send-message="sendMessage" @toggle-mic="toggleMic" class="fixed-input" />

    <PlaylistModal v-if="showPlaylistModal" :playlist="currentPlaylist" :currentIndex="currentIndex" @close="closePlaylist" @play="playSongByIndex" />
    <DJProfile :isOpen="showDJProfile" :currentSong="currentSong" :isPlaying="isPlaying" @close="closeDJProfile" />
    <FavoritesModal :isOpen="showFavoritesModal" :currentPlayingSongId="currentPlayingSongId" @close="closeFavorites" @play="playFavoriteSong" />
    <ConfigModal :isOpen="showConfigModal" @close="closeConfigModal" />
    <audio ref="audioPlayer" crossorigin="anonymous" @timeupdate="updateProgress" @ended="onSongEnded" @error="onPlayError"></audio>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 680px;
  margin: 0 auto;
  height: 100vh;
  background: #000000;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.app-container::-webkit-scrollbar {
  display: none;
}

.scrollable-content {
  position: relative;
  min-height: calc(100% - 76px);
  display: flex;
  flex-direction: column;
  padding-bottom: 76px;
}

.sticky-section {
  position: relative;
  z-index: 10;
  transition: all 0.3s ease;
}

.sticky-section.is-sticky {
  position: sticky;
  top: 0;
  background: #000000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.scroll-hint {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(to bottom, rgba(0, 255, 136, 0.3), transparent);
  pointer-events: none;
  z-index: 20;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: relative;
  min-height: 200px;
  max-height: 100%;
  scroll-behavior: smooth;
}

.chat-container.scroll-locked {
  overflow-y: auto;
}

/* 固定输入框在底部 */
.fixed-input {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 680px;
  z-index: 100;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
}
</style>
