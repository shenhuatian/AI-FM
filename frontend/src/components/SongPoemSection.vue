<template>
  <div class="song-poem-section" :class="{ 'poem-hidden': isPoemCollapsed }">
    <div class="song-info-area">
      <div class="audio-visualizer-container">
        <canvas ref="visualizerCanvas" class="audio-visualizer" :width="canvasWidth" height="60"></canvas>
      </div>
      <div class="now-playing">
        <div class="song-title">{{ currentSong.name }}</div>
        <div class="song-artist">{{ currentSong.artist }}</div>
      </div>
    </div>
    <transition name="poem-slide">
      <div v-if="!isPoemCollapsed" class="poem-area">
        <div class="poem-header">
          <span>AI POEM</span>
        </div>
        <div class="poem-content">
          <div v-if="poem === '诗歌将在播放音乐时生成...'" class="poem-placeholder">{{ poem }}</div>
          <div v-else class="poem-text">{{ poem }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

const props = defineProps({
  currentSong: Object,
  poem: String,
  isPlaying: Boolean,
  isPoemCollapsed: Boolean
})

const visualizerCanvas = ref(null)
let audioContext = null
let analyser = null
let dataArray = null
let animationId = null
let isInitialized = false
let sourceNode = null

// 根据诗歌是否折叠动态调整canvas宽度
const canvasWidth = computed(() => {
  return props.isPoemCollapsed ? 600 : 260
})

// 52个钢琴白键的频率（C1到C8）
const pianoWhiteKeys = [
  // C1-B1 (8个白键)
  32.70, 36.71, 41.20, 43.65, 49.00, 55.00, 61.74,
  // C2-B2 (7个白键)
  65.41, 73.42, 82.41, 87.31, 98.00, 110.00, 123.47,
  // C3-B3 (7个白键)
  130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94,
  // C4-B4 (7个白键，中央C区域)
  261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88,
  // C5-B5 (7个白键)
  523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77,
  // C6-B6 (7个白键)
  1046.50, 1174.66, 1318.51, 1396.91, 1567.98, 1760.00, 1975.53,
  // C7-B7 (7个白键)
  2093.00, 2349.32, 2637.02, 2793.83, 3135.96, 3520.00, 3951.07,
  // C8 (1个白键)
  4186.01
]

// 将频率转换为FFT bin索引
const freqToFFTIndex = (freq, sampleRate, fftSize) => {
  return Math.round(freq * fftSize / sampleRate)
}

// 获取某个频率附近的能量
const getEnergyAtFreq = (freq, dataArray, sampleRate, fftSize) => {
  const index = freqToFFTIndex(freq, sampleRate, fftSize)
  const range = 2 // 取周围几个bin的平均值，提高准确性

  let sum = 0
  let count = 0
  for (let i = Math.max(0, index - range); i <= Math.min(dataArray.length - 1, index + range); i++) {
    sum += dataArray[i]
    count++
  }

  return count > 0 ? sum / count : 0
}

onMounted(() => {
  // 延迟初始化，等待音频元素准备好
  setTimeout(() => {
    draw() // 先开始绘制，即使没有音频数据
  }, 100)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close()
  }
})

watch(() => props.isPlaying, (newVal) => {
  if (newVal && !isInitialized) {
    // 用户开始播放时才初始化Web Audio API
    setTimeout(() => {
      initAudioVisualizer()
    }, 500)
  }
})

const initAudioVisualizer = () => {
  if (isInitialized) return

  try {
    const audioElement = document.querySelector('audio')
    if (!audioElement) {
      console.warn('Audio element not found, will retry later')
      return
    }

    // 检查音频元素是否已经被其他AudioContext连接
    if (audioElement.captureStream) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 8192  // 更高的FFT大小以获得更好的频率分辨率
      analyser.smoothingTimeConstant = 0.75  // 适中的平滑度

      // 使用 try-catch 包裹，避免重复连接导致错误
      try {
        sourceNode = audioContext.createMediaElementSource(audioElement)
        sourceNode.connect(analyser)
        analyser.connect(audioContext.destination)

        const bufferLength = analyser.frequencyBinCount
        dataArray = new Uint8Array(bufferLength)

        isInitialized = true
        console.log('✅ Audio visualizer initialized (Piano mode)')
        console.log('📊 Sample rate:', audioContext.sampleRate)
        console.log('📊 FFT size:', analyser.fftSize)
      } catch (error) {
        // 如果已经连接过，忽略错误
        if (error.name === 'InvalidStateError') {
          console.log('Audio element already connected, skipping')
        } else {
          throw error
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize audio visualizer:', error)
    // 即使初始化失败，也继续绘制静态效果
  }
}

const draw = () => {
  if (!visualizerCanvas.value) {
    animationId = requestAnimationFrame(draw)
    return
  }

  const canvas = visualizerCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  if (analyser && dataArray && isInitialized) {
    analyser.getByteFrequencyData(dataArray)
  }

  ctx.clearRect(0, 0, width, height)

  const barCount = 52  // 52个钢琴白键
  const barWidth = Math.floor(width / barCount) - 1  // 自动计算宽度
  const gap = 1

  for (let i = 0; i < barCount; i++) {
    let barHeight = 4

    if (dataArray && props.isPlaying && isInitialized && audioContext) {
      // 方案A：真实音高检测
      const freq = pianoWhiteKeys[i]
      const energy = getEnergyAtFreq(freq, dataArray, audioContext.sampleRate, analyser.fftSize)

      // 根据频率范围调整灵敏度
      let sensitivity = 1.0
      if (freq < 100) {
        sensitivity = 1.5  // 低音区更灵敏
      } else if (freq > 2000) {
        sensitivity = 1.2  // 高音区稍微灵敏
      }

      barHeight = Math.max(4, (energy / 255) * height * 0.85 * sensitivity)
    } else if (props.isPlaying) {
      // 如果正在播放但还没初始化，显示简单动画
      barHeight = 8 + Math.sin(Date.now() / 150 + i * 0.3) * 6
    }

    const x = i * (barWidth + gap)
    const y = height - barHeight

    // 根据音高范围使用不同的颜色
    let color1, color2
    if (i < 14) {
      // 低音区 (C1-C3) - 深绿色
      color1 = '#00cc66'
      color2 = '#009944'
    } else if (i < 35) {
      // 中音区 (C3-C6) - 标准绿色
      color1 = '#00ff88'
      color2 = '#00cc66'
    } else {
      // 高音区 (C6-C8) - 亮绿色
      color1 = '#00ffaa'
      color2 = '#00ff88'
    }

    const gradient = ctx.createLinearGradient(x, y, x, height)
    gradient.addColorStop(0, color1)
    gradient.addColorStop(1, color2)

    ctx.fillStyle = gradient
    ctx.fillRect(x, y, barWidth, barHeight)
  }

  animationId = requestAnimationFrame(draw)
}
</script>

<style scoped>
.song-poem-section {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  display: flex;
  border-bottom: 1px solid #222;
  min-height: 180px;
  transition: all 0.3s ease;
}

.song-poem-section.poem-hidden .song-info-area {
  flex: 1;
  border-right: none;
}

.song-info-area {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #222;
  transition: all 0.3s ease;
}

.audio-visualizer-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-bottom: 1px solid #222;
  background: #000;
}

.audio-visualizer {
  display: block;
  transition: all 0.3s ease;
}

.now-playing {
  padding: 24px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.song-title {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.song-artist {
  font-size: 13px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
}

.poem-area {
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
}

.poem-header {
  font-size: 11px;
  color: #888;
  font-weight: 600;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
  padding: 16px 16px 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.poem-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1.8;
  color: #ccc;
  white-space: pre-wrap;
  text-align: center;
  padding: 0 12px 16px 12px;
  overflow: hidden;
}

.poem-placeholder {
  color: #666;
  font-size: 12px;
  font-style: italic;
}

.poem-text {
  color: #fff;
  font-size: 14px;
  line-height: 1.9;
}

.poem-slide-enter-active,
.poem-slide-leave-active {
  transition: all 0.3s ease;
}

.poem-slide-enter-from,
.poem-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.poem-slide-enter-to,
.poem-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
