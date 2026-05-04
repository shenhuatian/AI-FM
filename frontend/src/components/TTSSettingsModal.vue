<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click="closeModal">
      <div class="modal-container" @click.stop>
        <button class="close-btn" @click="closeModal">×</button>

        <div class="modal-header">
          <h2 class="modal-title">⚙️ Claudio FM TTS 设置</h2>
          <p class="modal-subtitle">配置语音生成和播放选项</p>
        </div>

        <div class="modal-body">
          <!-- 启用 TTS -->
          <div class="settings-section">
            <h3 class="section-title">🎤 语音生成设置</h3>
            <div class="setting-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.enabled" @change="saveSettings" />
                <span class="checkbox-text">启用 TTS 语音生成</span>
              </label>
              <p class="setting-hint">💡 关闭后将不生成语音，节省 Token</p>
            </div>
          </div>

          <!-- 播放模式 -->
          <div class="settings-section">
            <h3 class="section-title">🔊 播放模式</h3>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="playMode" value="auto" v-model="settings.playMode" @change="saveSettings" />
                <div class="radio-content">
                  <span class="radio-title">自动播放</span>
                  <span class="radio-desc">先播放 DJ 语音，再播放歌曲</span>
                </div>
              </label>
              <label class="radio-label">
                <input type="radio" name="playMode" value="manual" v-model="settings.playMode" @change="saveSettings" />
                <div class="radio-content">
                  <span class="radio-title">手动播放（推荐）</span>
                  <span class="radio-desc">直接播放歌曲，显示语音按钮</span>
                </div>
              </label>
            </div>
          </div>

          <!-- 音色选择 -->
          <div class="settings-section">
            <h3 class="section-title">🎵 音色选择</h3>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="voice" value="bingtang" v-model="settings.voice" @change="saveSettings" />
                <div class="radio-content">
                  <span class="radio-title">冰糖（中文女声）- 默认</span>
                </div>
              </label>
              <label class="radio-label">
                <input type="radio" name="voice" value="moli" v-model="settings.voice" @change="saveSettings" />
                <div class="radio-content">
                  <span class="radio-title">茉莉（中文女声）</span>
                </div>
              </label>
              <label class="radio-label">
                <input type="radio" name="voice" value="suda" v-model="settings.voice" @change="saveSettings" />
                <div class="radio-content">
                  <span class="radio-title">苏打（中文男声）</span>
                </div>
              </label>
              <label class="radio-label">
                <input type="radio" name="voice" value="baihua" v-model="settings.voice" @change="saveSettings" />
                <div class="radio-content">
                  <span class="radio-title">白桦（中文男声）</span>
                </div>
              </label>
            </div>
          </div>

          <!-- 语速设置 -->
          <div class="settings-section">
            <h3 class="section-title">⚡ 语速设置</h3>
            <div class="slider-container">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                v-model="settings.speed"
                @change="saveSettings"
                class="speed-slider"
              />
              <div class="slider-value">{{ settings.speed }}x</div>
            </div>
            <div class="slider-labels">
              <span>慢速 (0.5x)</span>
              <span>正常 (1.0x)</span>
              <span>快速 (2.0x)</span>
            </div>
          </div>

          <!-- 音量设置 -->
          <div class="settings-section">
            <h3 class="section-title">🔉 音量设置</h3>
            <div class="slider-container">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                v-model="settings.volume"
                @change="saveSettings"
                class="volume-slider"
              />
              <div class="slider-value">{{ settings.volume }}%</div>
            </div>
          </div>

          <!-- 保存提示 -->
          <div class="save-notice" v-if="showSaveNotice">
            <span class="save-icon">✓</span>
            <span>设置已保存</span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])

const settings = ref({
  enabled: true,
  playMode: 'manual',
  voice: 'bingtang',
  speed: 1.0,
  volume: 80
})

const showSaveNotice = ref(false)

onMounted(() => {
  loadSettings()
})

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadSettings()
  }
})

const loadSettings = () => {
  const saved = localStorage.getItem('tts_settings')
  if (saved) {
    try {
      settings.value = JSON.parse(saved)
    } catch (error) {
      console.error('加载 TTS 设置失败:', error)
    }
  }
}

const saveSettings = () => {
  localStorage.setItem('tts_settings', JSON.stringify(settings.value))

  // 显示保存提示
  showSaveNotice.value = true
  setTimeout(() => {
    showSaveNotice.value = false
  }, 2000)
}

const closeModal = () => {
  emit('close')
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
  z-index: 2100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-container {
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  background: #0a0a0a;
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 136, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  overflow-y: auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
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
  z-index: 10;
}

.close-btn:hover {
  background: rgba(255, 100, 100, 0.3);
  transform: rotate(90deg);
}

.modal-header {
  padding: 32px 32px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #00ff88;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.modal-subtitle {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.modal-body {
  padding: 24px 32px 32px;
}

.settings-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.setting-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #00ff88;
}

.checkbox-text {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  font-family: 'Courier New', monospace;
}

.setting-hint {
  font-size: 12px;
  color: #666;
  margin: 12px 0 0 32px;
  font-family: 'Courier New', monospace;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-label:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(0, 255, 136, 0.3);
}

.radio-label input[type="radio"] {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #00ff88;
  flex-shrink: 0;
}

.radio-label input[type="radio"]:checked ~ .radio-content {
  color: #00ff88;
}

.radio-label:has(input:checked) {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  font-family: 'Courier New', monospace;
}

.radio-desc {
  font-size: 12px;
  color: #888;
  font-family: 'Courier New', monospace;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.speed-slider,
.volume-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.speed-slider::-webkit-slider-thumb,
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #00ff88;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-slider::-webkit-slider-thumb:hover,
.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.slider-value {
  min-width: 50px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #00ff88;
  font-family: 'Courier New', monospace;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.save-notice {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 255, 136, 0.9);
  color: #000;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideUp 0.3s ease;
  z-index: 3000;
}

.save-icon {
  font-size: 16px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.modal-container::-webkit-scrollbar {
  width: 6px;
}

.modal-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.modal-container::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 136, 0.3);
  border-radius: 3px;
}

.modal-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 136, 0.5);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.9);
}

@media (max-width: 768px) {
  .modal-container {
    width: 95%;
  }

  .modal-header {
    padding: 24px 20px 16px;
  }

  .modal-body {
    padding: 16px 20px 24px;
  }
}
</style>
