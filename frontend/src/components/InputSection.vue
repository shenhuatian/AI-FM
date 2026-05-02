<template>
  <div class="input-section" :class="{ loading: isLoading }">
    <input type="text" class="chat-input" v-model="message" @keypress.enter="handleSend" placeholder="Say something to the DJ..." :disabled="isLoading">
    <button class="mic-btn" @click="$emit('toggle-mic')" :disabled="isLoading">🎤</button>
    <button class="send-btn" @click="handleSend" :disabled="isLoading" :class="{ loading: isLoading }">
      <span v-if="!isLoading">↑</span>
      <span v-else class="loading-spinner"></span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['send-message', 'toggle-mic'])
const message = ref('')
const isLoading = ref(false)

const handleSend = () => {
  if (message.value.trim() && !isLoading.value) {
    isLoading.value = true
    emit('send-message', message.value)
    message.value = ''

    // 模拟加载完成（实际应该由父组件控制）
    setTimeout(() => {
      isLoading.value = false
    }, 2000)
  }
}

// 暴露方法给父组件控制加载状态
defineExpose({
  setLoading: (loading) => {
    isLoading.value = loading
  }
})
</script>

<style scoped>
.input-section {
  flex-shrink: 0;
  z-index: 1;
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #222;
  background: #000;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.input-section.loading {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: inset 0 0 0 1px rgba(0, 255, 136, 0.2);
  }
  50% {
    box-shadow: inset 0 0 0 1px rgba(0, 255, 136, 0.4);
  }
}

.chat-input {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #fff;
  padding: 12px 16px;
  border-radius: 24px;
  outline: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.chat-input:focus {
  border-color: rgba(0, 255, 136, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1), 0 0 20px rgba(0, 255, 136, 0.2);
  background: #222;
}
.chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mic-btn, .send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.mic-btn::before, .send-btn::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: -1;
  opacity: 0;
}
.mic-btn:hover, .send-btn:hover {
  transform: scale(1.05) translateY(-1px);
  border-color: rgba(0, 255, 136, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
.mic-btn:hover::before, .send-btn:hover::before {
  opacity: 1;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}
.mic-btn:active, .send-btn:active {
  transform: scale(0.95) translateY(0);
  transition-duration: 0.1s;
}
.mic-btn:disabled, .send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: scale(1);
}
.send-btn {
  background: #fff;
  color: #000;
  font-size: 20px;
}
.send-btn:hover {
  background: #00ff88;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 136, 0.4);
}
.send-btn.loading {
  background: rgba(0, 255, 136, 0.2);
  border-color: rgba(0, 255, 136, 0.5);
}
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-top-color: #00ff88;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
