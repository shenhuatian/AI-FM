<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="wizard-overlay">
      <div class="wizard-container">
        <!-- 进度指示器 -->
        <div class="wizard-progress">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="progress-step"
            :class="{
              active: currentStep === index,
              completed: currentStep > index
            }"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>

        <!-- 步骤内容 -->
        <div class="wizard-content">
          <!-- 步骤 0: 欢迎 -->
          <div v-if="currentStep === 0" class="step-panel">
            <div class="welcome-icon">🎵</div>
            <h2 class="step-title">欢迎使用 Phoenix FM</h2>
            <p class="step-description">
              你的私人 AI 音乐 DJ，让我们花 2 分钟完成初始配置
            </p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">🧠</span>
                <span class="feature-text">AI 智能推荐音乐</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🎼</span>
                <span class="feature-text">网易云音乐库集成</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🎤</span>
                <span class="feature-text">语音播报（可选）</span>
              </div>
            </div>
          </div>

          <!-- 步骤 1: DeepSeek API Key -->
          <div v-if="currentStep === 1" class="step-panel">
            <h2 class="step-title">🧠 配置 AI 大脑</h2>
            <p class="step-description">
              Phoenix 使用 DeepSeek AI 来理解你的音乐喜好
            </p>

            <div class="input-section">
              <label class="input-label">DeepSeek API Key <span class="required">*必需</span></label>
              <input
                type="password"
                v-model="formData.deepseekKey"
                placeholder="sk-..."
                class="wizard-input"
                @input="clearValidation('deepseek')"
              />
              <div v-if="validation.deepseek.message" class="validation-message" :class="validation.deepseek.valid ? 'success' : 'error'">
                {{ validation.deepseek.valid ? '✅' : '❌' }} {{ validation.deepseek.message }}
              </div>
            </div>

            <div class="help-section">
              <button class="help-toggle" @click="showDeepSeekHelp = !showDeepSeekHelp">
                {{ showDeepSeekHelp ? '隐藏教程' : '📖 如何获取 API Key？' }}
              </button>
              <transition name="slide-down">
                <div v-if="showDeepSeekHelp" class="help-content">
                  <h4>获取 DeepSeek API Key 教程</h4>
                  <ol>
                    <li>访问 <a href="https://platform.deepseek.com/" target="_blank">platform.deepseek.com</a></li>
                    <li>注册并登录账号</li>
                    <li>进入"API Keys"页面</li>
                    <li>点击"创建新的 API Key"</li>
                    <li>复制生成的 Key（以 sk- 开头）</li>
                  </ol>
                  <p class="help-note">💡 新用户通常有免费额度可以使用</p>
                </div>
              </transition>
            </div>
          </div>

          <!-- 步骤 2: 网易云 Cookie（可选）-->
          <div v-if="currentStep === 2" class="step-panel">
            <h2 class="step-title">🎵 配置音乐服务</h2>
            <p class="step-description">
              配置网易云音乐 Cookie 以播放 VIP 歌曲（可选，可跳过）
            </p>

            <div class="input-section">
              <label class="input-label">网易云音乐 Cookie <span class="optional">可选</span></label>
              <textarea
                v-model="formData.ncmCookie"
                placeholder="MUSIC_U=..."
                class="wizard-textarea"
                rows="4"
                @input="clearValidation('ncm')"
              ></textarea>
              <div v-if="validation.ncm.message" class="validation-message" :class="validation.ncm.valid ? 'success' : 'error'">
                {{ validation.ncm.valid ? '✅' : '❌' }} {{ validation.ncm.message }}
                <span v-if="validation.ncm.nickname"> ({{ validation.ncm.nickname }})</span>
              </div>
            </div>

            <div class="help-section">
              <button class="help-toggle" @click="showNCMHelp = !showNCMHelp">
                {{ showNCMHelp ? '隐藏教程' : '📖 如何获取 Cookie？' }}
              </button>
              <transition name="slide-down">
                <div v-if="showNCMHelp" class="help-content">
                  <h4>获取网易云音乐 Cookie 教程</h4>
                  <ol>
                    <li>打开 <a href="https://music.163.com/" target="_blank">music.163.com</a> 并登录</li>
                    <li>按 F12 打开开发者工具</li>
                    <li>切换到"Network"（网络）标签</li>
                    <li>刷新页面</li>
                    <li>点击任意请求，找到"Request Headers"</li>
                    <li>复制"Cookie"字段的完整内容</li>
                  </ol>
                  <p class="help-note">💡 没有 VIP 也可以使用，只是部分歌曲可能无法播放</p>
                </div>
              </transition>
            </div>
          </div>

          <!-- 步骤 3: 完成 -->
          <div v-if="currentStep === 3" class="step-panel">
            <div class="success-icon">🎉</div>
            <h2 class="step-title">配置完成！</h2>
            <p class="step-description">
              你的配置已保存，现在可以开始使用 Phoenix FM 了
            </p>

            <div class="summary-section">
              <h3>配置摘要</h3>
              <div class="summary-item">
                <span class="summary-label">DeepSeek API:</span>
                <span class="summary-value">{{ formData.deepseekKey ? '✅ 已配置' : '❌ 未配置' }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">网易云 Cookie:</span>
                <span class="summary-value">{{ formData.ncmCookie ? '✅ 已配置' : '⏭️ 已跳过' }}</span>
              </div>
            </div>

            <div v-if="needRestart" class="restart-notice">
              <p>⚠️ 配置已保存到服务器，需要重启后端服务才能生效</p>
              <p class="restart-hint">请在终端按 Ctrl+C 停止服务，然后运行 <code>npm run dev</code> 重启</p>
            </div>
          </div>
        </div>

        <!-- 按钮区域 -->
        <div class="wizard-actions">
          <button
            v-if="currentStep > 0 && currentStep < 3"
            class="btn-secondary"
            @click="prevStep"
          >
            ← 上一步
          </button>
          <div class="spacer"></div>
          <button
            v-if="currentStep < 2"
            class="btn-primary"
            @click="nextStep"
            :disabled="!canProceed"
          >
            下一步 →
          </button>
          <button
            v-if="currentStep === 2"
            class="btn-secondary"
            @click="skipStep"
          >
            跳过
          </button>
          <button
            v-if="currentStep === 2"
            class="btn-primary"
            @click="nextStep"
            :disabled="validating.ncm"
          >
            {{ validating.ncm ? '验证中...' : '完成配置' }}
          </button>
          <button
            v-if="currentStep === 3"
            class="btn-primary"
            @click="finishSetup"
          >
            开始使用 🎵
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import configManager from '../utils/config.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'complete'])

const currentStep = ref(0)
const formData = ref({
  deepseekKey: '',
  ncmCookie: ''
})

const validation = ref({
  deepseek: { valid: false, message: '' },
  ncm: { valid: false, message: '', nickname: '' }
})

const validating = ref({
  deepseek: false,
  ncm: false
})

const showDeepSeekHelp = ref(false)
const showNCMHelp = ref(false)
const needRestart = ref(false)

const steps = [
  { label: '欢迎' },
  { label: 'AI 配置' },
  { label: '音乐服务' },
  { label: '完成' }
]

const canProceed = computed(() => {
  if (currentStep.value === 0) return true
  if (currentStep.value === 1) return validation.value.deepseek.valid
  if (currentStep.value === 2) return true
  return true
})

const clearValidation = (type) => {
  validation.value[type] = { valid: false, message: '' }
}

const validateDeepSeek = async () => {
  if (!formData.value.deepseekKey) {
    validation.value.deepseek = { valid: false, message: '请输入 API Key' }
    return false
  }

  validating.value.deepseek = true
  try {
    // 使用 configManager 统一封装的方法
    const result = await configManager.validateDeepSeek(formData.value.deepseekKey)
    validation.value.deepseek = {
      valid: result.valid,
      message: result.message
    }
    return result.valid
  } catch (error) {
    validation.value.deepseek = { valid: false, message: '网络错误' }
    return false
  } finally {
    validating.value.deepseek = false
  }
}

const validateNCM = async () => {
  if (!formData.value.ncmCookie) {
    return true
  }

  validating.value.ncm = true
  try {
    // 使用 configManager 统一封装的方法
    const result = await configManager.validateNCM(formData.value.ncmCookie)
    validation.value.ncm = {
      valid: result.valid,
      message: result.message,
      nickname: result.nickname || ''
    }
    return result.valid
  } catch (error) {
    validation.value.ncm = { valid: false, message: '网络错误', nickname: '' }
    return false
  } finally {
    validating.value.ncm = false
  }
}

const saveConfig = async () => {
  try {
    const response = await fetch('/api/config/save-to-env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          deepseekKey: formData.value.deepseekKey,
          ncmCookie: formData.value.ncmCookie
        }
      })
    })
    const data = await response.json()
    if (data.success) {
      needRestart.value = data.needRestart
      return true
    }
    return false
  } catch (error) {
    console.error('保存配置失败:', error)
    return false
  }
}

const nextStep = async () => {
  if (currentStep.value === 1) {
    const valid = await validateDeepSeek()
    if (!valid) return
  }

  if (currentStep.value === 2) {
    if (formData.value.ncmCookie) {
      const valid = await validateNCM()
      if (!valid) return
    }

    const saved = await saveConfig()
    if (!saved) {
      alert('保存配置失败，请重试')
      return
    }
  }

  currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const skipStep = async () => {
  if (currentStep.value === 2) {
    const saved = await saveConfig()
    if (!saved) {
      alert('保存配置失败，请重试')
      return
    }
    currentStep.value++
  }
}

const finishSetup = () => {
  emit('complete')
  emit('close')
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(10px);
}

.wizard-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #00ff88;
  border-radius: 20px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 255, 136, 0.3);
  display: flex;
  flex-direction: column;
}

.wizard-progress {
  display: flex;
  justify-content: space-between;
  padding: 30px 40px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.progress-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.progress-step.active,
.progress-step.completed {
  opacity: 1;
}

.progress-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 15px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: rgba(0, 255, 136, 0.2);
  z-index: -1;
}

.progress-step.completed:not(:last-child)::after {
  background: #00ff88;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 255, 136, 0.2);
  border: 2px solid rgba(0, 255, 136, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #00ff88;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.progress-step.active .step-number {
  background: #00ff88;
  color: #1a1a2e;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
}

.progress-step.completed .step-number {
  background: #00ff88;
  color: #1a1a2e;
}

.step-label {
  font-size: 12px;
  color: #888;
  text-align: center;
}

.progress-step.active .step-label,
.progress-step.completed .step-label {
  color: #00ff88;
}

.wizard-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
}

.step-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-icon,
.success-icon {
  font-size: 80px;
  text-align: center;
  margin-bottom: 20px;
}

.step-title {
  font-size: 28px;
  color: #00ff88;
  text-align: center;
  margin-bottom: 15px;
  font-weight: 600;
}

.step-description {
  font-size: 16px;
  color: #aaa;
  text-align: center;
  margin-bottom: 30px;
  line-height: 1.6;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 30px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(0, 255, 136, 0.05);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.4);
}

.feature-icon {
  font-size: 24px;
}

.feature-text {
  font-size: 16px;
  color: #ddd;
}

.input-section {
  margin-bottom: 25px;
}

.input-label {
  display: block;
  font-size: 14px;
  color: #00ff88;
  margin-bottom: 10px;
  font-weight: 500;
}

.required {
  color: #ff4444;
  font-size: 12px;
}

.optional {
  color: #888;
  font-size: 12px;
}

.wizard-input,
.wizard-textarea {
  width: 100%;
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
}

.wizard-input:focus,
.wizard-textarea:focus {
  outline: none;
  border-color: #00ff88;
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
}

.wizard-textarea {
  resize: vertical;
  min-height: 80px;
}

.validation-message {
  margin-top: 10px;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
}

.validation-message.success {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
}

.validation-message.error {
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  color: #ff4444;
}

.help-section {
  margin-top: 20px;
}

.help-toggle {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.help-toggle:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.help-content {
  margin-top: 15px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 8px;
}

.help-content h4 {
  color: #00ff88;
  margin-bottom: 15px;
  font-size: 16px;
}

.help-content ol {
  margin-left: 20px;
  color: #ddd;
  line-height: 1.8;
}

.help-content ol li {
  margin-bottom: 8px;
}

.help-content a {
  color: #00ff88;
  text-decoration: none;
  border-bottom: 1px dashed #00ff88;
}

.help-content a:hover {
  border-bottom-style: solid;
}

.help-note {
  margin-top: 15px;
  padding: 10px;
  background: rgba(0, 255, 136, 0.05);
  border-left: 3px solid #00ff88;
  color: #aaa;
  font-size: 13px;
}

.summary-section {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 10px;
  padding: 20px;
  margin-top: 20px;
}

.summary-section h3 {
  color: #00ff88;
  margin-bottom: 15px;
  font-size: 18px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  color: #aaa;
}

.summary-value {
  color: #00ff88;
  font-weight: 500;
}

.restart-notice {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 136, 0, 0.1);
  border: 1px solid rgba(255, 136, 0, 0.3);
  border-radius: 8px;
  color: #ffaa00;
}

.restart-notice p {
  margin-bottom: 10px;
}

.restart-notice code {
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #00ff88;
}

.restart-hint {
  font-size: 13px;
  color: #aaa;
}

.wizard-actions {
  display: flex;
  gap: 15px;
  padding: 20px 40px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(0, 255, 136, 0.2);
}

.spacer {
  flex: 1;
}

.btn-primary,
.btn-secondary {
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: #00ff88;
  color: #1a1a2e;
}

.btn-primary:hover:not(:disabled) {
  background: #00dd77;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
}

.btn-secondary:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.wizard-content::-webkit-scrollbar {
  width: 8px;
}

.wizard-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.wizard-content::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 136, 0.3);
  border-radius: 4px;
}

.wizard-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 136, 0.5);
}
</style>
