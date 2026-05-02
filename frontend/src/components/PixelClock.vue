<template>
  <div class="pixel-time-section" :class="{ collapsed: isCollapsed, 'focus-mode': isFocusMode }">
    <!-- Focus Mode - 极简栏 -->
    <div v-if="isFocusMode" class="focus-bar" @click="exitFocusMode">
      <div class="focus-logo">
        <div class="mini-avatar" :style="avatarStyle"></div>
        <span class="mini-brand">Claudio</span>
      </div>
      <button class="exit-focus-btn" @click.stop="exitFocusMode">
        EXIT FOCUS
      </button>
    </div>

    <!-- Normal Mode - 正常显示 -->
    <template v-else>
      <!-- Header with controls -->
      <div class="header">
        <div class="logo">
          <div class="avatar" :style="avatarStyle" @click="emit('openProfile')"></div>
          <span class="brand">Claudio</span>
        </div>
        <div class="controls">
          <button class="theme-toggle" @click="toggleTheme">
            {{ isDark ? 'DARK' : 'LIGHT' }}
          </button>
          <button class="theme-toggle" @click="togglePoem">
            POETRY
          </button>
          <button class="theme-toggle focus-btn" @click="enterFocusMode">
            FOCUS
          </button>
          <button class="collapse-toggle" @click="toggleCollapse">
            {{ isCollapsed ? '▼' : '▲' }}
          </button>
        </div>
      </div>

      <!-- Expandable content -->
      <transition name="expand">
        <div v-if="!isCollapsed" class="time-display">
          <div class="pixel-time">{{ currentTime }}</div>
          <div class="date-info">
            <div class="day-name">{{ dayName }}</div>
            <div class="date">{{ currentDate }}</div>
            <div class="status">
              <span class="status-dot"></span>
              <span class="status-text">ON AIR</span>
            </div>
          </div>
        </div>
      </transition>

      <!-- Collapsed view -->
      <div v-if="isCollapsed" class="collapsed-time">
        {{ currentTime }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getAvatar } from '../utils/avatar.js'

const props = defineProps({
  isPoemCollapsed: Boolean
})

const emit = defineEmits(['update:isPoemCollapsed', 'openProfile'])

const currentTime = ref('00:00')
const currentDate = ref('')
const dayName = ref('')
const isCollapsed = ref(false)
const isFocusMode = ref(false)
const isDark = ref(true)
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

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

  dayName.value = days[now.getDay()]
  const day = String(now.getDate()).padStart(2, '0')
  const month = months[now.getMonth()]
  const year = now.getFullYear()
  currentDate.value = `${day}·${month}·${year}`
}

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

const togglePoem = () => {
  emit('update:isPoemCollapsed', !props.isPoemCollapsed)
}

const enterFocusMode = () => {
  isFocusMode.value = true
}

const exitFocusMode = () => {
  isFocusMode.value = false
}

onMounted(() => {
  updateTime()
  intervalId = setInterval(updateTime, 1000)

  // 加载头像
  avatarUrl.value = getAvatar()

  // 监听头像更新事件
  window.addEventListener('avatar-updated', () => {
    avatarUrl.value = getAvatar()
  })
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.pixel-time-section {
  position: relative;
  z-index: 1;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid #222222;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.pixel-time-section.focus-mode {
  min-height: 40px;
  max-height: 40px;
}

.focus-bar {
  height: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: rgba(0, 0, 0, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
}

.focus-bar:hover {
  background: rgba(0, 0, 0, 1);
}

.focus-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.mini-brand {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1px;
}

.exit-focus-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1px;
}

.exit-focus-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(0, 255, 136, 0.5);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.brand {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.controls {
  display: flex;
  gap: 12px;
}

.theme-toggle,
.collapse-toggle {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Courier New', 'Consolas', monospace;
}

.theme-toggle:hover,
.collapse-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(0, 255, 136, 0.5);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.focus-btn {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.3);
  color: #00ff88;
}

.focus-btn:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: rgba(0, 255, 136, 0.5);
}

.time-display {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 100%);
}

.pixel-time {
  font-size: 96px;
  font-weight: 700;
  color: #ffffff;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 16px;
  text-shadow:
    0 0 20px rgba(255, 255, 255, 0.8),
    0 0 40px rgba(0, 255, 136, 0.4),
    0 0 60px rgba(0, 255, 136, 0.2);
  animation: pixelGlow 3s ease-in-out infinite;
  line-height: 1;
  margin-bottom: 20px;
}

.date-info {
  margin-top: 24px;
}

.day-name {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Courier New', 'Consolas', monospace;
  margin-bottom: 8px;
}

.date {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00ff88;
  box-shadow: 0 0 10px #00ff88;
  animation: pulse 2s ease-in-out infinite;
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  color: #00ff88;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1px;
}

.collapsed-time {
  text-align: center;
  padding: 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 4px;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

@keyframes pixelGlow {
  0%, 100% {
    text-shadow:
      0 0 20px rgba(255, 255, 255, 0.8),
      0 0 40px rgba(0, 255, 136, 0.4),
      0 0 60px rgba(0, 255, 136, 0.2);
  }
  50% {
    text-shadow:
      0 0 30px rgba(255, 255, 255, 1),
      0 0 60px rgba(0, 255, 136, 0.6),
      0 0 90px rgba(0, 255, 136, 0.3);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 400px;
}

@media (max-width: 480px) {
  .pixel-time {
    font-size: 64px;
    letter-spacing: 12px;
  }

  .brand {
    font-size: 20px;
  }

  .avatar {
    width: 32px;
    height: 32px;
  }

  .theme-toggle,
  .collapse-toggle {
    padding: 6px 12px;
    font-size: 10px;
  }
}
</style>
