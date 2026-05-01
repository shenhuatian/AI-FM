<script setup>
import { ref, onMounted } from 'vue'
import StarryBackground from './components/StarryBackground.vue'
import DotMatrix from './components/DotMatrix.vue'
import PixelClock from './components/PixelClock.vue'
import SongPoemSection from './components/SongPoemSection.vue'
import PlayerSection from './components/PlayerSection.vue'
import StatusSection from './components/StatusSection.vue'
import ChatSection from './components/ChatSection.vue'
import InputSection from './components/InputSection.vue'
import FooterStatus from './components/FooterStatus.vue'
import PlaylistModal from './components/PlaylistModal.vue'
import storage from './utils/storage.js'

const audioPlayer = ref(null)
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
  if (!song?.url) { addDJMessage('抱歉，无法播放这首歌 😔'); return }
  console.log('🎵 播放:', song.name)
  currentSong.value = song
  await generatePoem(song)
  audioPlayer.value.src = song.url
  audioPlayer.value.play().then(() => { isPlaying.value = true }).catch(() => { addDJMessage('播放出错 🔄'); skipNext() })
}

const playSongByIndex = (index) => {
    if (currentPlaylist.value[index]) {
      currentIndex.value = index
      playSong(currentPlaylist.value[index])
      storage.savePlaylist(currentPlaylist.value, currentIndex.value)
    }
  }
const playSongFromChat = (index) => { playSongByIndex(index) }

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
    messages.value.push({ type: 'user', text, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit',
  minute: '2-digit' }) })
    storage.addMessage('user', text)
  }  
const addDJMessage = (text, songs = null, reason = null) => {
    messages.value.push({ type: 'dj', text, songs, reason, time: new Date().toLocaleTimeString('zh-CN', { hour:
  '2-digit', minute: '2-digit' }) })
    storage.addMessage('dj', text, songs, reason)
    }
const showPlaylist = () => { showPlaylistModal.value = true }
const closePlaylist = () => { showPlaylistModal.value = false }
const showFavorites = () => { addDJMessage('收藏夹功能开发中 🎵') }
const toggleMic = () => { addDJMessage('语音输入功能开发中 🎤') }
</script>

<template>
  <div class="app-container">
    <StarryBackground />
    <DotMatrix />
    <PixelClock :isPoemCollapsed="isPoemCollapsed" @update:isPoemCollapsed="isPoemCollapsed = $event" />
    <SongPoemSection :currentSong="currentSong" :poem="currentPoem" :isPlaying="isPlaying" :isPoemCollapsed="isPoemCollapsed" />
    <PlayerSection :isPlaying="isPlaying" :isLiked="isLiked" :volume="volume" :currentTime="currentTime" :duration="duration" @play="togglePlay" @previous="skipPrevious" @next="skipNext" @stop="stopPlayback" @like="toggleLike" @volume-change="changeVolume" @seek="seekTo" @show-playlist="showPlaylist" @show-favorites="showFavorites" />
    <StatusSection />
    <ChatSection :messages="messages" @play-song="playSongFromChat" />
    <InputSection @send-message="sendMessage" @toggle-mic="toggleMic" />
    <FooterStatus />
    <PlaylistModal v-if="showPlaylistModal" :playlist="currentPlaylist" :currentIndex="currentIndex" @close="closePlaylist" @play="playSongByIndex" />
    <audio ref="audioPlayer" crossorigin="anonymous" @timeupdate="updateProgress" @ended="onSongEnded" @error="onPlayError"></audio>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 680px;
  margin: 0 auto;
  height: 100vh;
  background: #000000;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
</style>
