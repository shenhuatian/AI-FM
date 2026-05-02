<template>
  <div class="ambience-light" :style="ambienceStyle" :data-mood="currentMood"></div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  isPlaying: Boolean,
  currentSong: Object
})

const currentMood = ref('neutral')

// 根据歌曲名称和艺术家推测情绪
const detectMood = (song) => {
  if (!song || !song.name) return 'neutral'

  const text = `${song.name} ${song.artist}`.toLowerCase()

  // 悲伤/忧郁 - 蓝紫色调
  if (text.match(/(sad|lonely|blue|rain|tears|goodbye|miss|alone|夜|雨|孤独|想念|离别|悲伤)/)) {
    return 'melancholy'
  }

  // 激情/能量 - 红橙色调
  if (text.match(/(rock|fire|energy|power|wild|crazy|dance|party|热|燃|疯狂|摇滚|激情)/)) {
    return 'energetic'
  }

  // 平静/放松 - 青绿色调
  if (text.match(/(calm|peace|relax|soft|gentle|quiet|jazz|安静|平静|轻柔|爵士|舒缓)/)) {
    return 'calm'
  }

  // 浪漫/温暖 - 粉紫色调
  if (text.match(/(love|heart|romance|sweet|warm|kiss|爱|浪漫|甜蜜|温暖|心)/)) {
    return 'romantic'
  }

  return 'neutral'
}

// 情绪对应的颜色配置
const moodColors = {
  neutral: {
    primary: 'rgba(0, 0, 0, 0.95)',
    secondary: 'rgba(0, 20, 20, 0.9)',
    accent: '#00ff88'
  },
  melancholy: {
    primary: 'rgba(10, 10, 40, 0.95)',
    secondary: 'rgba(30, 20, 60, 0.9)',
    accent: '#6b8cff'
  },
  energetic: {
    primary: 'rgba(40, 10, 10, 0.95)',
    secondary: 'rgba(60, 20, 10, 0.9)',
    accent: '#ff6b6b'
  },
  calm: {
    primary: 'rgba(0, 20, 30, 0.95)',
    secondary: 'rgba(10, 30, 40, 0.9)',
    accent: '#4ecdc4'
  },
  romantic: {
    primary: 'rgba(30, 10, 30, 0.95)',
    secondary: 'rgba(50, 20, 40, 0.9)',
    accent: '#ff6ba8'
  }
}

// 监听歌曲变化
watch(() => props.currentSong, (newSong) => {
  if (newSong && props.isPlaying) {
    currentMood.value = detectMood(newSong)
    // 将情绪色彩注入到全局CSS变量
    updateGlobalColors()
  }
}, { immediate: true })

// 监听播放状态
watch(() => props.isPlaying, (playing) => {
  if (!playing) {
    // 停止播放时逐渐回到中性色调
    setTimeout(() => {
      if (!props.isPlaying) {
        currentMood.value = 'neutral'
        updateGlobalColors()
      }
    }, 2000)
  }
})

// 更新全局CSS变量
const updateGlobalColors = () => {
  const colors = moodColors[currentMood.value]
  document.documentElement.style.setProperty('--mood-accent', colors.accent)
}

// 计算氛围灯光样式
const ambienceStyle = computed(() => {
  const colors = moodColors[currentMood.value]
  return {
    background: `radial-gradient(ellipse at center, ${colors.secondary} 0%, ${colors.primary} 70%, rgba(0, 0, 0, 1) 100%)`,
    opacity: props.isPlaying ? 1 : 0.5
  }
})
</script>

<style scoped>
.ambience-light {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  transition: all 3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
