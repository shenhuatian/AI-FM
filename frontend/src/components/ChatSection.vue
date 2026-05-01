<template>
  <div class="chat-section">
    <div class="chat-messages">
      <div v-for="(msg, index) in messages" :key="index" class="message" :class="msg.type">
        <div class="message-header">
          <div class="message-avatar">{{ msg.type === 'user' ? '👤' : '🎵' }}</div>
          <div class="message-sender">{{ msg.type === 'user' ? 'YOU' : 'CLAUDIO' }}</div>
        </div>
        <div class="message-content">{{ msg.text }}</div>
        <div class="message-time">{{ msg.time }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ messages: Array })
defineEmits(['play-song'])
</script>

<style scoped>
.chat-section {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 300px;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* 隐藏 Webkit 浏览器的滚动条 */
.chat-section::-webkit-scrollbar {
  display: none;
}

.chat-messages { display: flex; flex-direction: column; gap: 16px; }
.message { display: flex; flex-direction: column; gap: 8px; }
.message-header { display: flex; align-items: center; gap: 8px; }
.message-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; background: #1a1a1a; border: 1px solid #333; }
.message-sender { font-size: 12px; color: #888; text-transform: uppercase; font-family: 'Courier New', monospace; }
.message-content { background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 12px 16px; font-size: 14px; color: #ccc; margin-left: 40px; }
.message.user .message-content { background: rgba(0, 255, 136, 0.1); border-color: rgba(0, 255, 136, 0.3); color: #fff; margin-left: 0; margin-right: 40px; }
.message.user { align-items: flex-end; }
.message-time { font-size: 11px; color: #666; font-family: 'Courier New', monospace; margin-left: 40px; }
.message.user .message-time { margin-left: 0; margin-right: 40px; }
</style>
