<template>
  <transition name="profile-slide">
    <div v-if="isOpen" class="profile-overlay" @click="closeProfile">
      <div class="profile-sidebar" @click.stop>
        <button class="close-btn" @click="closeProfile">×</button>
        <div class="profile-header">
          <div class="avatar-container" @click="triggerAvatarUpload">
            <div class="avatar" :style="avatarStyle"></div>
            <div class="avatar-overlay"><span>更换头像</span></div>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" style="display: none" @change="handleAvatarUpload" />
          <h1 class="dj-name">Claudio</h1>
          <div class="dj-subtitle" @click="editSubtitle" v-if="!isEditingSubtitle">{{ subtitle }}</div>
          <input v-else v-model="subtitle" class="subtitle-input" @blur="saveSubtitle" @keyup.enter="saveSubtitle" ref="subtitleInput" />
        </div>
        <div class="profile-bio">
          <div class="bio-content" @click="editBio" v-if="!isEditingBio">{{ bio }}</div>
          <textarea v-else v-model="bio" class="bio-input" @blur="saveBio" ref="bioInput"></textarea>
        </div>
        <div class="profile-status">
          <div class="status-item"><div class="status-label">ON AIR</div><div class="status-value">{{ onAirStatus }}</div></div>
          <div class="status-item"><div class="status-label">GENRES</div><div class="status-value">∞</div></div>
          <div class="status-item"><div class="status-label">LISTENER</div><div class="status-value">1</div></div>
        </div>
        <div class="now-playing" v-if="currentSong.name !== 'Waiting...'">
          <div class="playing-icon">▶</div>
          <div class="playing-info">
            <div class="playing-song">{{ currentSong.name }}</div>
            <div class="playing-artist">{{ currentSong.artist }}</div>
          </div>
        </div>
        <div class="music-genres">
          <div class="genres-title">你喜欢的音乐类型</div>
          <div class="genres-tags"><span v-for="(genre, index) in genres" :key="index" class="genre-tag">{{ genre }}</span></div>
        </div>

        <!-- 🔥 主动对话设置 -->
        <div class="proactive-settings">
          <div class="settings-title">主动对话设置</div>
          <div class="settings-description">让 Claudio 主动和你聊天、推荐音乐</div>
          <div class="settings-options">
            <div
              class="setting-option"
              :class="{ active: proactiveLevel === 'quiet' }"
              @click="setProactiveLevel('quiet')"
            >
              <div class="option-icon">🔇</div>
              <div class="option-label">安静模式</div>
              <div class="option-desc">不主动说话</div>
            </div>
            <div
              class="setting-option"
              :class="{ active: proactiveLevel === 'medium' }"
              @click="setProactiveLevel('medium')"
            >
              <div class="option-icon">💬</div>
              <div class="option-label">适度互动</div>
              <div class="option-desc">20-30分钟</div>
            </div>
            <div
              class="setting-option"
              :class="{ active: proactiveLevel === 'active' }"
              @click="setProactiveLevel('active')"
            >
              <div class="option-icon">🎵</div>
              <div class="option-label">活跃模式</div>
              <div class="option-desc">15-20分钟</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { getAvatar, setAvatar, compressImage } from '../utils/avatar.js'

const props = defineProps({ isOpen: Boolean, currentSong: Object, isPlaying: Boolean })
const emit = defineEmits(['close'])
const avatarInput = ref(null)
const subtitleInput = ref(null)
const bioInput = ref(null)
const avatarUrl = ref('')
const subtitle = ref('懂你的AI DJ')
const bio = ref('Your mood is my prompt.\nI hate algorithm. I have taste.')
const isEditingSubtitle = ref(false)
const isEditingBio = ref(false)
const genres = ref([])
const proactiveLevel = ref('medium')
const avatarStyle = computed(() => avatarUrl.value ? { backgroundImage: `url(${avatarUrl.value})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' })
const onAirStatus = computed(() => props.isPlaying ? 'ON AIR' : 'OFFLINE')

onMounted(async () => {
  const savedAvatar = getAvatar()
  const savedSubtitle = localStorage.getItem('dj_subtitle')
  const savedBio = localStorage.getItem('dj_bio')
  if (savedAvatar) avatarUrl.value = savedAvatar
  if (savedSubtitle) subtitle.value = savedSubtitle
  if (savedBio) bio.value = savedBio
  await loadGenres()
  await loadProactiveSettings()
})

const loadGenres = async () => {
  try {
    const response = await fetch('/api/user-taste')
    const data = await response.json()
    if (data.genres) genres.value = data.genres
  } catch (error) {
    genres.value = ['JAZZ', '90S华语', '下雨白噪音', '流行', 'BLUES']
  }
}

const loadProactiveSettings = async () => {
  try {
    const response = await fetch('/api/proactive/settings')
    const data = await response.json()
    if (data.settings) {
      proactiveLevel.value = data.settings.level || 'medium'
    }
  } catch (error) {
    console.error('加载主动对话设置失败:', error)
  }
}

const setProactiveLevel = async (level) => {
  proactiveLevel.value = level
  try {
    await fetch('/api/proactive/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { level } })
    })
    console.log('✅ 主动对话设置已更新:', level)
  } catch (error) {
    console.error('更新主动对话设置失败:', error)
  }
}

const triggerAvatarUpload = () => avatarInput.value.click()

const handleAvatarUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  try {
    console.log('📸 开始压缩图片...')
    // 压缩图片到 200x200，质量 0.8
    const compressedImage = await compressImage(file, 200, 0.8)
    avatarUrl.value = compressedImage
    setAvatar(compressedImage)
    console.log('✅ 头像已保存')

    // 触发全局事件，通知其他组件更新头像
    window.dispatchEvent(new Event('avatar-updated'))
  } catch (error) {
    console.error('❌ 头像上传失败:', error)
    alert('头像上传失败: ' + error.message)
  }
}

const editSubtitle = () => { isEditingSubtitle.value = true; nextTick(() => subtitleInput.value?.focus()) }
const saveSubtitle = () => { isEditingSubtitle.value = false; localStorage.setItem('dj_subtitle', subtitle.value) }
const editBio = () => { isEditingBio.value = true; nextTick(() => bioInput.value?.focus()) }
const saveBio = () => { isEditingBio.value = false; localStorage.setItem('dj_bio', bio.value) }
const closeProfile = () => emit('close')
</script>

<style scoped>
.profile-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);z-index:1000;display:flex;justify-content:center;align-items:center;padding:20px}
.profile-sidebar{width:90%;max-width:400px;max-height:90vh;background:#0a0a0a;overflow-y:auto;padding:40px 32px;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.8);border-radius:16px;border:1px solid rgba(255,255,255,0.1)}
.close-btn{position:absolute;top:16px;right:16px;width:32px;height:32px;border:none;background:rgba(255,255,255,0.1);color:#fff;font-size:24px;border-radius:50%;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;line-height:1}
.close-btn:hover{background:rgba(255,255,255,0.2);transform:rotate(90deg)}
.profile-header{text-align:center;margin-bottom:32px}
.avatar-container{position:relative;width:120px;height:120px;margin:0 auto 16px;cursor:pointer}
.avatar{width:100%;height:100%;border-radius:50%;border:3px solid rgba(255,255,255,0.2);transition:all 0.3s}
.avatar-overlay{position:absolute;top:0;left:0;right:0;bottom:0;border-radius:50%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s;color:#fff;font-size:12px}
.avatar-container:hover .avatar-overlay{opacity:1}
.dj-name{font-size:36px;font-weight:700;color:#fff;font-family:'Courier New',monospace;letter-spacing:4px;margin-bottom:8px}
.dj-subtitle{font-size:14px;color:#00ff88;font-family:'Courier New',monospace;cursor:pointer;padding:4px 8px;border-radius:4px;transition:background 0.2s}
.dj-subtitle:hover{background:rgba(0,255,136,0.1)}
.subtitle-input{width:100%;background:rgba(255,255,255,0.1);border:1px solid rgba(0,255,136,0.5);border-radius:4px;padding:8px;color:#00ff88;font-size:14px;font-family:'Courier New',monospace;text-align:center;outline:none}
.profile-bio{margin-bottom:32px;padding:16px;background:rgba(255,255,255,0.05);border-radius:8px}
.bio-content{color:#ccc;font-size:14px;line-height:1.8;white-space:pre-wrap;cursor:pointer;min-height:60px;transition:background 0.2s;padding:8px;border-radius:4px}
.bio-content:hover{background:rgba(255,255,255,0.05)}
.bio-input{width:100%;min-height:100px;background:rgba(255,255,255,0.1);border:1px solid rgba(0,255,136,0.5);border-radius:4px;padding:8px;color:#fff;font-size:14px;line-height:1.8;font-family:inherit;outline:none;resize:vertical}
.profile-status{display:flex;justify-content:space-around;margin-bottom:32px;padding:16px;background:rgba(255,255,255,0.05);border-radius:8px}
.status-item{text-align:center}
.status-label{font-size:10px;color:#888;font-family:'Courier New',monospace;letter-spacing:1px;margin-bottom:8px}
.status-value{font-size:24px;font-weight:700;color:#fff;font-family:'Courier New',monospace}
.now-playing{display:flex;align-items:center;gap:12px;padding:16px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:8px;margin-bottom:32px}
.playing-icon{font-size:24px;color:#00ff88}
.playing-info{flex:1}
.playing-song{font-size:14px;font-weight:600;color:#fff;margin-bottom:4px}
.playing-artist{font-size:12px;color:#888}
.music-genres{margin-bottom:32px}
.genres-title{font-size:12px;color:#888;font-family:'Courier New',monospace;letter-spacing:1px;margin-bottom:16px}
.genres-tags{display:flex;flex-wrap:wrap;gap:8px}
.genre-tag{padding:8px 16px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:20px;color:#fff;font-size:12px;font-family:'Courier New',monospace;letter-spacing:1px;transition:all 0.2s}
.genre-tag:hover{background:rgba(255,255,255,0.15);border-color:rgba(0,255,136,0.5)}
.profile-slide-enter-active,.profile-slide-leave-active{transition:all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)}
.profile-slide-enter-from .profile-sidebar,.profile-slide-leave-to .profile-sidebar{transform:translateX(100vw) scale(0.9);opacity:0}
.profile-slide-enter-to .profile-sidebar,.profile-slide-leave-from .profile-sidebar{transform:translateX(0) scale(1);opacity:1}
.profile-slide-enter-from,.profile-slide-leave-to{opacity:0}
.profile-slide-enter-to,.profile-slide-leave-from{opacity:1}
.profile-sidebar::-webkit-scrollbar{width:6px}
.profile-sidebar::-webkit-scrollbar-track{background:rgba(255,255,255,0.05)}
.profile-sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);border-radius:3px}
.profile-sidebar::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.3)}

/* 主动对话设置样式 */
.proactive-settings{margin-bottom:32px;padding:20px;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.2);border-radius:12px}
.settings-title{font-size:14px;font-weight:600;color:#00ff88;font-family:'Courier New',monospace;letter-spacing:1px;margin-bottom:8px}
.settings-description{font-size:12px;color:#888;margin-bottom:20px;line-height:1.6}
.settings-options{display:flex;gap:12px;flex-wrap:wrap}
.setting-option{flex:1;min-width:100px;padding:16px 12px;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.1);border-radius:8px;text-align:center;cursor:pointer;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1)}
.setting-option:hover{background:rgba(255,255,255,0.1);border-color:rgba(0,255,136,0.3);transform:translateY(-2px)}
.setting-option.active{background:rgba(0,255,136,0.15);border-color:#00ff88;box-shadow:0 0 20px rgba(0,255,136,0.3)}
.option-icon{font-size:24px;margin-bottom:8px}
.option-label{font-size:12px;font-weight:600;color:#fff;font-family:'Courier New',monospace;margin-bottom:4px}
.option-desc{font-size:10px;color:#888;font-family:'Courier New',monospace}

@media (max-width:768px){.profile-sidebar{width:80%}}
</style>
