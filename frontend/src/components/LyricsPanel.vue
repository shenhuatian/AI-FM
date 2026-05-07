<template>
  <div class="lyrics-panel" :class="{ 'collapsed': isCollapsed }">
    <div class="lyrics-header" @click="toggleCollapse">
      <span class="lyrics-title">{{ isCollapsed ? '▶ LYRICS' : '▼ LYRICS' }}</span>
      <span v-if="!isCollapsed && hasLyrics" class="lyrics-count">{{ parsedLyrics.length }} 行</span>
    </div>
    <transition name="lyrics-expand">
      <div v-if="!isCollapsed" class="lyrics-content" ref="lyricsContainer">
        <div v-if="loading" class="lyrics-loading">
          <div class="loading-spinner"></div>
          <span>加载歌词中...</span>
        </div>
        <div v-else-if="error" class="lyrics-error">
          {{ error }}
        </div>
        <div v-else-if="!hasLyrics" class="lyrics-empty">
          暂无歌词
        </div>
        <div v-else class="lyrics-list">
          <div
            v-for="(line, index) in parsedLyrics"
            :key="index"
            :ref="el => { if (el) lyricRefs[index] = el }"
            class="lyric-line"
            :class="{
              'active': currentLineIndex === index,
              'prev': index < currentLineIndex,
              'next': index > currentLineIndex
            }"
            @click="seekToLine(line.time)"
          >
            {{ line.text }}
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  songId: [String, Number],
  currentTime: Number,
  isPlaying: Boolean
})

const emit = defineEmits(['seek'])

const isCollapsed = ref(true)
const loading = ref(false)
const error = ref(null)
const rawLyrics = ref('')
const parsedLyrics = ref([])
const currentLineIndex = ref(-1)
const lyricsContainer = ref(null)
const lyricRefs = ref([])

const hasLyrics = computed(() => parsedLyrics.value.length > 0)

// 解析 LRC 格式歌词
const parseLyrics = (lrcText) => {
  if (!lrcText || lrcText === '暂无歌词') {
    return []
  }

  const lines = lrcText.split('\n')
  const parsed = []

  // LRC 时间标签正则：[mm:ss.xx] 或 [mm:ss.xxx]
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)]
    if (matches.length === 0) continue

    // 提取歌词文本（去掉所有时间标签）
    const text = line.replace(timeRegex, '').trim()
    if (!text) continue

    // 一行可能有多个时间标签（重复歌词）
    for (const match of matches) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const milliseconds = parseInt(match[3].padEnd(3, '0')) // 处理 .xx 和 .xxx

      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000

      parsed.push({
        time: timeInSeconds,
        text: text
      })
    }
  }

  // 按时间排序
  parsed.sort((a, b) => a.time - b.time)

  return parsed
}

// 加载歌词
const loadLyrics = async (songId) => {
  if (!songId) {
    parsedLyrics.value = []
    currentLineIndex.value = -1
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await fetch(`/api/lyric/${songId}`)
    const data = await response.json()

    if (data.error) {
      error.value = data.error
      parsedLyrics.value = []
    } else {
      rawLyrics.value = data.lyric || ''
      parsedLyrics.value = parseLyrics(data.lyric)

      if (parsedLyrics.value.length === 0) {
        error.value = '暂无歌词'
      }
    }
  } catch (err) {
    console.error('加载歌词失败:', err)
    error.value = '加载歌词失败'
    parsedLyrics.value = []
  } finally {
    loading.value = false
  }
}

// 根据当前播放时间更新高亮行
const updateCurrentLine = (currentTime) => {
  if (!parsedLyrics.value.length) {
    currentLineIndex.value = -1
    return
  }

  // 找到当前时间对应的歌词行
  let index = -1
  for (let i = 0; i < parsedLyrics.value.length; i++) {
    if (currentTime >= parsedLyrics.value[i].time) {
      index = i
    } else {
      break
    }
  }

  if (index !== currentLineIndex.value) {
    currentLineIndex.value = index
    scrollToCurrentLine()
  }
}

// 滚动到当前歌词行
const scrollToCurrentLine = () => {
  if (currentLineIndex.value < 0 || !lyricsContainer.value) return

  nextTick(() => {
    const currentElement = lyricRefs.value[currentLineIndex.value]
    if (currentElement && lyricsContainer.value) {
      const containerHeight = lyricsContainer.value.clientHeight
      const elementTop = currentElement.offsetTop
      const elementHeight = currentElement.clientHeight

      // 将当前行滚动到容器中间
      const scrollTop = elementTop - containerHeight / 2 + elementHeight / 2

      lyricsContainer.value.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  })
}

// 点击歌词行跳转到对应时间
const seekToLine = (time) => {
  // 直接使用歌词的时间戳和歌曲总时长计算百分比
  // 注意：这里需要使用 duration 而不是 currentTime
  // 但我们没有 duration prop，所以需要从父组件获取
  // 临时方案：使用 audioPlayer 的 duration
  const audioElement = document.querySelector('audio')
  if (audioElement && audioElement.duration) {
    const percent = (time / audioElement.duration) * 100
    emit('seek', percent)
  }
}

// 切换折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 监听歌曲变化
watch(() => props.songId, (newSongId) => {
  if (newSongId) {
    loadLyrics(newSongId)
  } else {
    parsedLyrics.value = []
    currentLineIndex.value = -1
  }
}, { immediate: true })

// 监听播放时间变化
watch(() => props.currentTime, (newTime) => {
  if (props.isPlaying && parsedLyrics.value.length > 0) {
    updateCurrentLine(newTime)
  }
})

onMounted(() => {
  if (props.songId) {
    loadLyrics(props.songId)
  }
})

onUnmounted(() => {
  lyricRefs.value = []
})
</script>

<style scoped>
.lyrics-panel {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  border-bottom: 1px solid #222;
  background: rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

.lyrics-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.lyrics-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.lyrics-title {
  font-size: 11px;
  color: #888;
  font-weight: 600;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
}

.lyrics-count {
  font-size: 10px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.lyrics-content {
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 16px 16px 16px;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}

.lyrics-content::-webkit-scrollbar {
  width: 4px;
}

.lyrics-content::-webkit-scrollbar-track {
  background: transparent;
}

.lyrics-content::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}

.lyrics-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.lyrics-loading,
.lyrics-error,
.lyrics-empty {
  text-align: center;
  padding: 24px 16px;
  color: #666;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.lyrics-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-top-color: #00ff88;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lyrics-error {
  color: #ff6b6b;
}

.lyrics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lyric-line {
  font-size: 14px;
  line-height: 1.8;
  color: #666;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.lyric-line:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #999;
}

.lyric-line.active {
  color: #00ff88;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  transform: translateX(4px);
}

.lyric-line.prev {
  color: #555;
}

.lyric-line.next {
  color: #777;
}

.lyrics-expand-enter-active,
.lyrics-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.lyrics-expand-enter-from,
.lyrics-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.lyrics-expand-enter-to,
.lyrics-expand-leave-from {
  max-height: 200px;
  opacity: 1;
}

@media (max-width: 480px) {
  .lyrics-content {
    max-height: 150px;
  }

  .lyric-line {
    font-size: 13px;
  }

  .lyric-line.active {
    font-size: 15px;
  }
}
</style>
