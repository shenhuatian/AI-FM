<script setup>
import { ref, onMounted, nextTick, getCurrentInstance } from 'vue'
import StarryBackground from './components/StarryBackground.vue'
import DotMatrix from './components/DotMatrix.vue'
import AmbienceLight from './components/AmbienceLight.vue'
import RetroEffects from './components/RetroEffects.vue'
import MusicParticles from './components/MusicParticles.vue'
import PixelClock from './components/PixelClock.vue'
import SongPoemSection from './components/SongPoemSection.vue'
import PlayerSection from './components/PlayerSection.vue'
import LyricsPanel from './components/LyricsPanel.vue'
import StatusSection from './components/StatusSection.vue'
import ChatSection from './components/ChatSection.vue'
import InputSection from './components/InputSection.vue'
import PlaylistModal from './components/PlaylistModal.vue'
import DJProfile from './components/DJProfile.vue'
import FavoritesModal from './components/FavoritesModal.vue'
import ConfigModal from './components/ConfigModal.vue'
import SetupWizard from './components/SetupWizard.vue'
import storage from './utils/storage.js'
import configManager from './utils/config.js'
import { loadFavoritesFromBackend } from './utils/favorites.js'

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
const chatKey = ref(0)
const showPlaylistModal = ref(false)
const isPoemCollapsed = ref(false)
const isSticky = ref(false)
const showDJProfile = ref(false)
const currentPlayingSongId = ref(null)
const showFavoritesModal = ref(false)
const showConfigModal = ref(false)
const showSetupWizard = ref(false)
const instance = getCurrentInstance()
const playMode = ref('manual')
const ttsMode = ref('music') // TTS 模式：'dj' | 'music' | 'quiet'

onMounted(async () => {
    // 检查后端配置状态
    const backendStatus = await configManager.getStatus()
    const hasBackendConfig = backendStatus?.deepseek?.configured

    // 只有在后端未配置时才显示配置向导
    if (!hasBackendConfig) {
      showSetupWizard.value = true
    } else {
      // 后端已配置，清除前端配置，确保使用后端配置
      localStorage.removeItem('claudio_config')
      console.log('✅ 后端已配置，使用后端配置')
    }

    const savedMessages = storage.getAllMessages()
    if (savedMessages.length > 0) {
      messages.value = savedMessages
    } else {
      addDJMessage('嗨！我是Phoenix，你的AI音乐DJ 🎵')
    }

    const { playlist, currentIndex: savedIndex } = storage.getPlaylist()
    if (playlist.length > 0) {
      currentPlaylist.value = playlist
      currentIndex.value = savedIndex
    }

    if (audioPlayer.value) audioPlayer.value.volume = volume.value / 100

    // 连接 WebSocket 接收主动消息
    connectWebSocket()

    // 加载播放模式
    loadPlayMode()

    // 加载 TTS 模式
    loadTTSMode()

    // 监听播放模式变化事件
    window.addEventListener('playmode-changed', (e) => {
      playMode.value = e.detail.mode
      console.log('✅ 播放模式已更新:', playMode.value)
    })

    // 监听 TTS 模式变化事件
    window.addEventListener('ttsmode-changed', (e) => {
      ttsMode.value = e.detail.mode
      console.log('✅ TTS 模式已更新:', ttsMode.value)
    })

    // 🔥 从后端加载收藏数据
    console.log('📚 正在从后端加载收藏数据...')
    await loadFavoritesFromBackend()
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

  // 🔥 修复：在智能续播模式下，不要循环回到开头
  if (playMode.value === 'auto' && currentIndex.value >= currentPlaylist.value.length - 1) {
    // 已经是最后一首，不要跳转
    addDJMessage('播放列表已结束，等待 AI 推荐新歌 🎵')
    return
  }

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

  // 更新当前播放歌曲 ID（转换为字符串）
  currentPlayingSongId.value = String(song.id)

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
          resetPlayErrorCount() // 重置错误计数器
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
    audioPlayer.value.play().then(() => {
      isPlaying.value = true
      resetPlayErrorCount() // 重置错误计数器
    }).catch(() => {
      addDJMessage('播放出错')
      skipNext()
    })
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
    // 🔥 更新播放列表和索引
    currentPlaylist.value = message.songs
    currentIndex.value = songIndex

    const song = message.songs[songIndex]
    playSong(song)

    // 保存到 storage
    storage.savePlaylist(currentPlaylist.value, currentIndex.value)
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

const onSongEnded = async () => {
  if (playMode.value === 'auto') {
    // 智能续播模式
    if (currentIndex.value === currentPlaylist.value.length - 1) {
      // 最后一首歌，请求 AI 推荐
      console.log('🤖 智能续播：请求 AI 推荐新歌...')
      await requestAutoRecommendation()
    } else {
      // 还有下一首，继续播放
      skipNext()
    }
  } else if (playMode.value === 'loop') {
    // 列表循环模式
    skipNext()
  } else {
    // 手动模式，停止播放
    isPlaying.value = false
    console.log('⏸️ 手动模式：播放完毕，等待用户指令')
  }
}

// 播放错误计数器，防止无限循环
let playErrorCount = 0
const MAX_PLAY_ERRORS = 3

const onPlayError = () => {
  playErrorCount++
  console.error(`播放错误 (${playErrorCount}/${MAX_PLAY_ERRORS})`)

  if (playErrorCount >= MAX_PLAY_ERRORS) {
    addDJMessage('连续播放失败，请检查网络或更换歌曲 😔')
    playErrorCount = 0 // 重置计数器
    isPlaying.value = false
    return
  }

  addDJMessage('播放出错 🔄')
  skipNext()
}

// 播放成功时重置错误计数器
const resetPlayErrorCount = () => {
  playErrorCount = 0
}

const chatSectionRef = ref(null)

const sendMessage = async (message) => {
  if (!message.trim()) return
  addUserMessage(message)
  try {
    // 获取前端配置
    const config = configManager.getAll()

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        config: {
          deepseekKey: config.deepseekKey,
          ncmCookie: config.ncmCookie,
          xiaomiKey: config.xiaomiKey
        }
      })
    })

    const data = await response.json()

    // 检查是否需要配置
    if (data.needConfig) {
      addDJMessage('⚠️ 请先配置 DeepSeek API Key 才能使用')
      showConfigModal.value = true
      return
    }

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
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      text,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    messages.value = [...messages.value, newMessage]
    storage.addMessage('user', text)
  }
const addDJMessage = (text, songs = null, reason = null, isProactive = false, ttsUrl = null) => {
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'dj',
      text,
      songs,
      reason,
      isProactive,
      ttsUrl, // 存储 TTS 音频 URL
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    // 直接使用展开运算符创建新数组（触发 Vue 响应式）
    messages.value = [...messages.value, newMessage]

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
const openSettings = () => { showConfigModal.value = true }
const closeSettings = () => { showConfigModal.value = false }
const onConfigSaved = () => {
  addDJMessage('配置已保存，正在重新加载...')
}

const onSetupComplete = () => {
  showSetupWizard.value = false
  addDJMessage('欢迎使用 Phoenix FM！配置已保存，请重启服务后开始使用 🎵')
  // 清除前端 localStorage 配置，确保使用后端配置
  localStorage.removeItem('claudio_config')
}

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

// 生成或获取客户端唯一标识（使用 sessionStorage，每个标签页独立）
const getClientId = () => {
  let clientId = sessionStorage.getItem('claudio_client_id')
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('claudio_client_id', clientId)
  }
  return clientId
}

// TTS 播放状态管理（防止重复播放）
let currentTTSAudio = null
let lastTTSUrl = null

// WebSocket 连接 - 接收主动消息
const connectWebSocket = () => {
  console.log('🔌 [测试] 尝试连接 WebSocket...')
  const ws = new WebSocket('ws://localhost:8080/stream')
  const clientId = getClientId()

  ws.onopen = () => {
    console.log('✅ [测试] WebSocket 已连接')
    // 连接成功后立即发送客户端标识
    ws.send(JSON.stringify({
      type: 'register',
      clientId: clientId
    }))
    console.log('📤 已发送客户端标识:', clientId)
  }

  ws.onmessage = (event) => {
    console.log('📨 [测试] 收到原始 WebSocket 数据:', event.data)
    try {
      const data = JSON.parse(event.data)
      console.log('📨 [测试] 解析后的数据:', data)

      if (data.type === 'proactive') {
        // AI 主动发起的消息
        console.log('🔥 [测试] 收到主动消息')
        console.log('🔥 [测试] 当前 messages 数量:', messages.value.length)
        console.log('🔥 [测试] 消息内容:', data.message)

        addDJMessage(data.message, data.songs, data.reason, true)

        console.log('🔥 [测试] 添加后 messages 数量:', messages.value.length)
        console.log('🔥 [测试] 最新消息:', messages.value[messages.value.length - 1])
        console.log('🔥 [测试] messages.value 引用:', messages.value)

        // 🔥 强制触发 Vue 更新并滚动到底部
        nextTick(() => {
          // 强制更新整个组件
          if (instance) {
            console.log('🔥 [测试] 执行 forceUpdate')
            instance.proxy.$forceUpdate()
          }

          // 直接操作 DOM 滚动到底部
          setTimeout(() => {
            const appContainer = document.querySelector('.app-container')
            if (appContainer) {
              console.log('🔥 [测试] 找到 app-container，执行滚动')
              appContainer.scrollTo({
                top: appContainer.scrollHeight,
                behavior: 'smooth'
              })
            } else {
              console.log('❌ [测试] 未找到 app-container')
            }
          }, 100)
        })

        // 如果有推荐歌曲，更新播放列表
        if (data.songs && data.songs.length > 0) {
          currentPlaylist.value = data.songs
          currentIndex.value = 0
          storage.savePlaylist(currentPlaylist.value, currentIndex.value)
        }

        // 播放提示音（可选）
        playProactiveNotification()
      } else if (data.type === 'tts') {
        // 收到 TTS 音频
        if (data.audioUrl) {
          // 确保 URL 是完整的
          const audioUrl = data.audioUrl.startsWith('http')
            ? data.audioUrl
            : `http://localhost:8080${data.audioUrl}`

          // 防止重复播放相同的 TTS
          if (lastTTSUrl === audioUrl) {
            console.log('⚠️ 跳过重复的 TTS:', audioUrl)
            return
          }

          // 将 TTS URL 存储到最新的 DJ 消息中
          const lastDJMessage = messages.value.filter(m => m.type === 'dj').pop()
          if (lastDJMessage) {
            lastDJMessage.ttsUrl = audioUrl
          }

          // 根据 TTS 模式决定是否自动播放
          if (ttsMode.value === 'dj') {
            // DJ 模式：自动播放 TTS
            playTTSAudio(audioUrl)
          } else if (ttsMode.value === 'music') {
            // 音乐模式：不自动播放，等待用户点击
            console.log('🎵 音乐模式：TTS 已准备，等待用户点击播放')
          } else if (ttsMode.value === 'quiet') {
            // 安静模式：不播放 TTS
            console.log('🔇 安静模式：跳过 TTS 播放')
          }
        }
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
    // WebSocket 已断开，5秒后重连
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

// 播放 TTS 音频
const playTTSAudio = (audioUrl) => {
  // 停止之前的 TTS
  if (currentTTSAudio) {
    currentTTSAudio.pause()
    currentTTSAudio = null
  }

  lastTTSUrl = audioUrl
  currentTTSAudio = new Audio(audioUrl)
  currentTTSAudio.volume = volume.value / 100

  currentTTSAudio.addEventListener('error', (e) => {
    console.error('TTS 播放失败详情:', {
      error: e,
      src: currentTTSAudio.src,
      networkState: currentTTSAudio.networkState,
      readyState: currentTTSAudio.readyState
    })
  })

  currentTTSAudio.addEventListener('ended', () => {
    // TTS 播放完成后清理
    currentTTSAudio = null
    lastTTSUrl = null

    // DJ 模式下，TTS 播放完毕后自动播放音乐
    if (ttsMode.value === 'dj' && !isPlaying.value && currentPlaylist.value.length > 0) {
      console.log('🎙️ DJ 模式：TTS 播放完毕，开始播放音乐')
      playSong(currentPlaylist.value[currentIndex.value])
    }
  })

  currentTTSAudio.play().catch(error => {
    console.error('TTS 播放失败:', error)
  })
}

// 加载播放模式
const loadPlayMode = async () => {
  try {
    const response = await fetch('/api/playmode/settings')
    const data = await response.json()
    if (data.settings) {
      playMode.value = data.settings.mode || 'manual'
      console.log('✅ 播放模式已加载:', playMode.value)
    }
  } catch (error) {
    console.error('加载播放模式失败:', error)
    const savedMode = localStorage.getItem('play_mode')
    if (savedMode) playMode.value = savedMode
  }
}

// 加载 TTS 模式
const loadTTSMode = async () => {
  try {
    const response = await fetch('/api/tts/config')
    const data = await response.json()
    if (data.settings) {
      ttsMode.value = data.settings.mode || 'music'
      console.log('✅ TTS 模式已加载:', ttsMode.value)
    }
  } catch (error) {
    console.error('加载 TTS 模式失败:', error)
    const savedMode = localStorage.getItem('tts_mode')
    if (savedMode) ttsMode.value = savedMode
  }
}

// 请求自动推荐
const requestAutoRecommendation = async () => {
  try {
    const lastSong = currentPlaylist.value[currentIndex.value]
    const config = configManager.getAll()

    const response = await fetch('/api/auto-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastSong: lastSong,
        config: {
          deepseekKey: config.deepseekKey,
          ncmCookie: config.ncmCookie
        }
      })
    })

    const data = await response.json()

    if (data.songs && data.songs.length > 0) {
      // 在聊天区显示 AI 的推荐消息
      addDJMessage(data.say || '好听吗？再来点舒服的，下班路上放松一下', data.songs, data.reason || '智能续播')

      // 添加到播放列表
      currentPlaylist.value = [...currentPlaylist.value, ...data.songs]
      storage.savePlaylist(currentPlaylist.value, currentIndex.value)
      skipNext()
      console.log('✅ 智能续播：已添加', data.songs.length, '首新歌')
    } else {
      console.log('⚠️ 智能续播：没有推荐到新歌')
      isPlaying.value = false
    }
  } catch (error) {
    console.error('自动推荐失败:', error)
    isPlaying.value = false
  }
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
      <PixelClock :isPoemCollapsed="isPoemCollapsed" @update:isPoemCollapsed="isPoemCollapsed = $event" @openProfile="openDJProfile" @openSettings="openSettings" />

      <!-- 吸附区域 -->
      <div class="sticky-section" :class="{ 'is-sticky': isSticky }" @wheel="handleStickyScroll">
        <!-- 向上渐变光晕提示 -->
        <div v-if="isSticky" class="scroll-hint"></div>

        <SongPoemSection :currentSong="currentSong" :poem="currentPoem" :isPlaying="isPlaying" :isPoemCollapsed="isPoemCollapsed" />
        <PlayerSection :isPlaying="isPlaying" :isLiked="isLiked" :volume="volume" :currentTime="currentTime" :duration="duration" @play="togglePlay" @previous="skipPrevious" @next="skipNext" @stop="stopPlayback" @like="toggleLike" @volume-change="changeVolume" @seek="seekTo" @show-playlist="showPlaylist" @show-favorites="showFavorites" />
        <LyricsPanel :songId="currentPlaylist[currentIndex]?.id" :currentTime="currentTime" :isPlaying="isPlaying" @seek="seekTo" />
        <StatusSection />
      </div>

      <!-- 聊天区域 - 独立滚动 -->
      <div class="chat-container" :class="{ 'scroll-locked': isSticky }">
        <ChatSection ref="chatSectionRef" :messages="messages" :currentPlayingSongId="currentPlayingSongId" :ttsMode="ttsMode" @play-song="playSongFromChat" @play-tts="playTTSAudio" />
      </div>
    </div>

    <!-- 输入框固定在底部 -->
    <InputSection @send-message="sendMessage" @toggle-mic="toggleMic" class="fixed-input" />

    <PlaylistModal v-if="showPlaylistModal" :playlist="currentPlaylist" :currentIndex="currentIndex" @close="closePlaylist" @play="playSongByIndex" />
    <DJProfile :isOpen="showDJProfile" :currentSong="currentSong" :isPlaying="isPlaying" @close="closeDJProfile" />
    <FavoritesModal :isOpen="showFavoritesModal" :currentPlayingSongId="currentPlayingSongId" @close="closeFavorites" @play="playFavoriteSong" />
    <ConfigModal :isOpen="showConfigModal" @close="closeSettings" @saved="onConfigSaved" />
    <SetupWizard :isOpen="showSetupWizard" @close="showSetupWizard = false" @complete="onSetupComplete" />
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
