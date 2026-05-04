<template>
  <div style="background: red; color: yellow; padding: 50px; font-size: 30px; text-align: center;">
    ⚙️⚙️⚙️ 这是新的 ConfigModal.vue ⚙️⚙️⚙️
    <br>
    如果你看到这个，说明加载了正确的组件！
    <br>
    <button @click="$emit('close')" style="font-size: 20px; padding: 10px 20px; margin-top: 20px;">关闭</button>
  </div>
</template>

<script setup>
defineProps({
  isOpen: Boolean
})

defineEmits(['close'])
</script>
