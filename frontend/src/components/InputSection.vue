<template>
  <div class="input-section">
    <input type="text" class="chat-input" v-model="message" @keypress.enter="handleSend" placeholder="Say something to the DJ...">
    <button class="mic-btn" @click="$emit('toggle-mic')">🎤</button>
    <button class="send-btn" @click="handleSend">↑</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['send-message', 'toggle-mic'])
const message = ref('')
const handleSend = () => {
  if (message.value.trim()) {
    emit('send-message', message.value)
    message.value = ''
  }
}
</script>

<style scoped>
.input-section { flex-shrink: 0; z-index: 1; display: flex; gap: 8px; padding: 16px; border-top: 1px solid #222; background: #000; }
.chat-input { flex: 1; background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 12px 16px; border-radius: 24px; outline: none; }
.mic-btn, .send-btn { width: 44px; height: 44px; border-radius: 50%; background: #1a1a1a; border: 1px solid #333; color: #fff; cursor: pointer; }
.send-btn { background: #fff; color: #000; }
</style>
