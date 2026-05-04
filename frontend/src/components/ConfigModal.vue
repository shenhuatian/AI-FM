<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container">
        <!-- 头部 -->
        <div class="modal-header">
          <h2 class="modal-title">⚙️ Claudio FM 配置中心</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <!-- 内容 -->
        <div class="modal-content">
          <!-- 🧠 AI 配置 -->
          <div class="config-section">
            <h3 class="section-title">🧠 AI 配置</h3>

            <!-- DeepSeek API Key -->
            <div class="config-item">
              <label class="config-label">
                DeepSeek API Key <span class="required">*必需</span>
                <span v-if="getSourceLabel('deepseekKey')" class="source-badge" :class="{ 'source-backend': configSources.deepseekKey === 'backend', 'source-frontend': configSources.deepseekKey === 'frontend' }">
                  {{ getSourceLabel('deepseekKey') }}
                </span>
              </label>
              <div class="input-group">
                <input
                  :type="configSources.deepseekKey === 'backend' ? 'text' : 'password'"
                  v-model="config.deepseekKey"
                  :placeholder="configSources.deepseekKey === 'backend' ? '后端已配置，无需重复输入' : 'sk-...'"
                  class="config-input"
                  :class="{ 'backend-value': configSources.deepseekKey === 'backend' && !dirtyFields.has('deepseekKey') }"
                  @input="onConfigChange('deepseekKey')"
                  @focus="$event.target.select()"
                />
                <button
                  class="test-btn"
                  @click="testDeepSeek"
                  :disabled="validating.deepseek"
                >
                  {{ validating.deepseek ? '测试中...' : '测试连接' }}
                </button>
              </div>
              <div v-if="validation.deepseek.message" class="validation-message" :class="validation.deepseek.valid ? 'success' : 'error'">
                {{ validation.deepseek.valid ? '✅' : '❌' }} {{ validation.deepseek.message }}
              </div>
              <div class="config-hint">
                💡 获取地址: <a href="https://platform.deepseek.com/" target="_blank">platform.deepseek.com</a>
              </div>
            </div>
          </div>

          <!-- 🎵 音乐配置 -->
          <div class="config-section">
            <h3 class="section-title">🎵 音乐配置</h3>

            <!-- 网易云 Cookie -->
            <div class="config-item">
              <label class="config-label">
                网易云音乐 Cookie <span class="recommended">推荐</span>
                <span v-if="getSourceLabel('ncmCookie')" class="source-badge" :class="{ 'source-backend': configSources.ncmCookie === 'backend', 'source-frontend': configSources.ncmCookie === 'frontend' }">
                  {{ getSourceLabel('ncmCookie') }}
                </span>
              </label>
              <div class="input-group">
                <textarea
                  v-model="config.ncmCookie"
                  :placeholder="configSources.ncmCookie === 'backend' ? '后端已配置，无需重复输入' : 'MUSIC_U=...'"
                  class="config-textarea"
                  :class="{ 'backend-value': configSources.ncmCookie === 'backend' && !dirtyFields.has('ncmCookie') }"
                  rows="3"
                  @input="onConfigChange('ncmCookie')"
                  @focus="$event.target.select()"
                ></textarea>
              </div>
              <div class="button-group">
                <button
                  class="test-btn"
                  @click="testNCM"
                  :disabled="validating.ncm"
                >
                  {{ validating.ncm ? '验证中...' : '验证Cookie' }}
                </button>
                <button class="help-btn" @click="showCookieTutorial = !showCookieTutorial">
                  {{ showCookieTutorial ? '隐藏教程' : '📖 如何获取Cookie？' }}
                </button>
              </div>
              <div v-if="validation.ncm.message" class="validation-message" :class="validation.ncm.valid ? 'success' : 'error'">
                {{ validation.ncm.valid ? '✅' : '❌' }} {{ validation.ncm.message }}
                <span v-if="validation.ncm.nickname"> ({{ validation.ncm.nickname }})</span>
              </div>
              <div class="config-hint">
                💡 用于播放VIP歌曲和获取高音质
              </div>

              <!-- 导入音乐库 -->
              <div class="import-section">
                <button
                  @click="showImportOptions = !showImportOptions"
                  :disabled="!validation.ncm.valid"
                  class="import-toggle-btn"
                >
                  🎧 导入我的音乐库
                </button>

                <!-- 导入选项（展开后显示） -->
                <div v-if="showImportOptions" class="import-options">
                  <button
                    @click="importMusicLibrary('full')"
                    :disabled="importing"
                    class="import-btn full"
                  >
                    <span v-if="importing && importMode === 'full'">⏳ 导入中...</span>
                    <span v-else>🔄 重新导入（覆盖）</span>
                  </button>

                  <button
                    @click="importMusicLibrary('incremental')"
                    :disabled="importing"
                    class="import-btn incremental"
                  >
                    <span v-if="importing && importMode === 'incremental'">⏳ 更新中...</span>
                    <span v-else>➕ 增量更新（合并）</span>
                  </button>
                </div>

                <!-- 导入结果 -->
                <div v-if="importResult" class="import-result">
                  <div v-if="importResult.success" class="success">
                    ✅ 导入成功！
                    <ul>
                      <li>收藏歌曲：{{ importResult.stats.likedSongs }} 首</li>
                      <li>歌单：{{ importResult.stats.playlists }} 个</li>
                      <li>听歌记录（周）：{{ importResult.stats.playHistoryWeek }} 条</li>
                      <li>听歌记录（总）：{{ importResult.stats.playHistoryAll }} 条</li>
                    </ul>
                  </div>
                  <div v-else class="error">
                    ❌ {{ importResult.error }}
                  </div>
                </div>
              </div>

              <!-- Cookie 获取教程 -->
              <transition name="slide-down">
                <div v-if="showCookieTutorial" class="tutorial-box">
                  <h4>📖 获取网易云音乐 Cookie 教程</h4>
                  <ol class="tutorial-steps">
                    <li>打开 <a href="https://music.163.com/" target="_blank">music.163.com</a> 并登录</li>
                    <li>按 <code>F12</code> 打开开发者工具</li>
                    <li>切换到 <strong>Network</strong>（网络）标签</li>
                    <li>刷新页面（<code>F5</code>）</li>
                    <li>点击任意一个请求</li>
                    <li>在右侧找到 <strong>Request Headers</strong></li>
                    <li>找到 <strong>Cookie</strong> 字段</li>
                    <li>复制整个 Cookie 值（很长的一串文本）</li>
                    <li>粘贴到上面的输入框中</li>
                  </ol>
                  <div class="tutorial-note">
                    ⚠️ Cookie 包含登录信息，请勿分享给他人
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- 🌤️ 可选服务 -->
          <div class="config-section">
            <div class="section-header" @click="showAdvanced = !showAdvanced">
              <h3 class="section-title">🌤️ 可选服务</h3>
              <span class="toggle-icon">{{ showAdvanced ? '▼' : '▶' }}</span>
            </div>

            <transition name="slide-down">
              <div v-if="showAdvanced" class="advanced-options">
                <!-- 小米 MiMo TTS API -->
                <div class="config-item">
                  <label class="config-label">
                    小米 MiMo TTS API Key <span class="optional">可选</span>
                    <span v-if="getSourceLabel('xiaomiKey')" class="source-badge" :class="{ 'source-backend': configSources.xiaomiKey === 'backend', 'source-frontend': configSources.xiaomiKey === 'frontend' }">
                      {{ getSourceLabel('xiaomiKey') }}
                    </span>
                  </label>
                  <div class="input-group">
                    <input
                      :type="configSources.xiaomiKey === 'backend' ? 'text' : 'password'"
                      v-model="config.xiaomiKey"
                      placeholder="用于语音合成（限时免费）"
                      class="config-input"
                      :class="{ 'backend-value': configSources.xiaomiKey === 'backend' && !dirtyFields.has('xiaomiKey') }"
                      @input="onConfigChange('xiaomiKey')"
                      @focus="$event.target.select()"
                    />
                    <button
                      class="test-btn"
                      @click="showTTSConfig = !showTTSConfig"
                    >
                      {{ showTTSConfig ? '隐藏配置' : '⚙️ TTS 配置' }}
                    </button>
                  </div>
                  <div class="config-hint">
                    💡 获取地址: <a href="https://platform.xiaomimimo.com/" target="_blank">platform.xiaomimimo.com</a>
                  </div>

                  <!-- TTS 配置面板 -->
                  <transition name="slide-down">
                    <div v-if="showTTSConfig" class="tts-config-panel">
                      <h4>🎤 TTS 语音配置</h4>

                      <!-- 启用开关 -->
                      <div class="tts-config-item">
                        <label class="tts-label">
                          <input
                            type="checkbox"
                            v-model="ttsConfig.enabled"
                            class="tts-checkbox"
                          />
                          启用 TTS 语音合成
                        </label>
                      </div>

                      <!-- 音色选择 -->
                      <div class="tts-config-item">
                        <label class="tts-label">音色选择</label>
                        <select v-model="ttsConfig.voice" class="tts-select" :disabled="!ttsConfig.enabled">
                          <optgroup label="中文音色">
                            <option value="冰糖">冰糖（中文女声）</option>
                            <option value="茉莉">茉莉（中文女声）</option>
                            <option value="苏打">苏打（中文男声）</option>
                            <option value="白桦">白桦（中文男声）</option>
                          </optgroup>
                          <optgroup label="英文音色">
                            <option value="Mia">Mia（英文女声）</option>
                            <option value="Chloe">Chloe（英文女声）</option>
                            <option value="Milo">Milo（英文男声）</option>
                            <option value="Dean">Dean（英文男声）</option>
                          </optgroup>
                        </select>
                      </div>

                      <!-- 模式选择 -->
                      <div class="tts-config-item">
                        <label class="tts-label">播放模式</label>
                        <div class="tts-mode-group">
                          <label class="tts-mode-option" :class="{ active: ttsConfig.mode === 'dj', disabled: !ttsConfig.enabled }">
                            <input
                              type="radio"
                              v-model="ttsConfig.mode"
                              value="dj"
                              :disabled="!ttsConfig.enabled"
                            />
                            <div class="mode-content">
                              <span class="mode-icon">🎙️</span>
                              <span class="mode-name">DJ 模式</span>
                              <span class="mode-desc">语音自动播放 → 音乐</span>
                            </div>
                          </label>

                          <label class="tts-mode-option" :class="{ active: ttsConfig.mode === 'music', disabled: !ttsConfig.enabled }">
                            <input
                              type="radio"
                              v-model="ttsConfig.mode"
                              value="music"
                              :disabled="!ttsConfig.enabled"
                            />
                            <div class="mode-content">
                              <span class="mode-icon">🎵</span>
                              <span class="mode-name">音乐模式</span>
                              <span class="mode-desc">音乐优先，点击播放语音</span>
                            </div>
                          </label>

                          <label class="tts-mode-option" :class="{ active: ttsConfig.mode === 'quiet', disabled: !ttsConfig.enabled }">
                            <input
                              type="radio"
                              v-model="ttsConfig.mode"
                              value="quiet"
                              :disabled="!ttsConfig.enabled"
                            />
                            <div class="mode-content">
                              <span class="mode-icon">🔇</span>
                              <span class="mode-name">安静模式</span>
                              <span class="mode-desc">完全关闭语音</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <!-- 保存按钮 -->
                      <div class="tts-config-actions">
                        <button
                          class="btn-save-tts"
                          @click="saveTTSConfig"
                          :disabled="savingTTS"
                        >
                          {{ savingTTS ? '保存中...' : '保存 TTS 配置' }}
                        </button>
                      </div>
                    </div>
                  </transition>
                </div>

                <!-- OpenWeather API -->
                <div class="config-item">
                  <label class="config-label">
                    OpenWeather API Key <span class="optional">可选</span>
                    <span v-if="getSourceLabel('openweatherKey')" class="source-badge" :class="{ 'source-backend': configSources.openweatherKey === 'backend', 'source-frontend': configSources.openweatherKey === 'frontend' }">
                      {{ getSourceLabel('openweatherKey') }}
                    </span>
                  </label>
                  <input
                    :type="configSources.openweatherKey === 'backend' ? 'text' : 'password'"
                    v-model="config.openweatherKey"
                    placeholder="用于天气服务"
                    class="config-input"
                    :class="{ 'backend-value': configSources.openweatherKey === 'backend' && !dirtyFields.has('openweatherKey') }"
                    @input="onConfigChange('openweatherKey')"
                    @focus="$event.target.select()"
                  />
                  <div class="config-hint">
                    💡 获取地址: <a href="https://openweathermap.org/api" target="_blank">openweathermap.org</a>
                  </div>
                </div>

                <!-- 飞书日历 -->
                <div class="config-item">
                  <label class="config-label">
                    飞书 App ID <span class="optional">可选</span>
                    <span v-if="getSourceLabel('feishuAppId')" class="source-badge" :class="{ 'source-backend': configSources.feishuAppId === 'backend', 'source-frontend': configSources.feishuAppId === 'frontend' }">
                      {{ getSourceLabel('feishuAppId') }}
                    </span>
                  </label>
                  <input
                    type="text"
                    v-model="config.feishuAppId"
                    placeholder="用于日程服务"
                    class="config-input"
                    :class="{ 'backend-value': configSources.feishuAppId === 'backend' && !dirtyFields.has('feishuAppId') }"
                    @input="onConfigChange('feishuAppId')"
                    @focus="$event.target.select()"
                  />
                </div>

                <div class="config-item">
                  <label class="config-label">
                    飞书 App Secret <span class="optional">可选</span>
                    <span v-if="getSourceLabel('feishuAppSecret')" class="source-badge" :class="{ 'source-backend': configSources.feishuAppSecret === 'backend', 'source-frontend': configSources.feishuAppSecret === 'frontend' }">
                      {{ getSourceLabel('feishuAppSecret') }}
                    </span>
                  </label>
                  <input
                    type="password"
                    v-model="config.feishuAppSecret"
                    placeholder="用于日程服务"
                    class="config-input"
                    :class="{ 'backend-value': configSources.feishuAppSecret === 'backend' && !dirtyFields.has('feishuAppSecret') }"
                    @input="onConfigChange('feishuAppSecret')"
                    @focus="$event.target.select()"
                  />
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="resetConfig">重置</button>
          <button class="btn btn-warning" @click="clearLocalConfig">清除本地配置</button>
          <button class="btn btn-primary" @click="saveConfig" :disabled="!canSave">
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import configManager from '../utils/config.js'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'saved'])

// 配置数据（输入框的值）
const config = ref({
  deepseekKey: '',
  ncmCookie: '',
  xiaomiKey: '',
  openweatherKey: '',
  feishuAppId: '',
  feishuAppSecret: ''
})

// 配置来源（'frontend' | 'backend' | null）
const configSources = ref({
  deepseekKey: null,
  ncmCookie: null,
  xiaomiKey: null,
  openweatherKey: null,
  feishuAppId: null,
  feishuAppSecret: null
})

// 🔥 脱敏的后端值（仅用于显示，不参与实际调用）
const maskedBackendValues = ref({
  deepseekKey: null,
  ncmCookie: null,
  xiaomiKey: null,
  openweatherKey: null,
  feishuAppId: null,
  feishuAppSecret: null
})

// 🔥 标记用户是否修改了来自后端的字段（修改后变为 frontend）
const dirtyFields = ref(new Set())

// 验证状态
const validation = ref({
  deepseek: { valid: false, message: '' },
  ncm: { valid: false, message: '', nickname: '', isVIP: false }
})

const validating = ref({
  deepseek: false,
  ncm: false
})

// UI 状态
const showCookieTutorial = ref(false)
const showAdvanced = ref(false)
const showTTSConfig = ref(false)
const saving = ref(false)
const savingTTS = ref(false)
const loading = ref(true)

// 导入音乐库相关状态
const showImportOptions = ref(false)
const importing = ref(false)
const importMode = ref('')
const importResult = ref(null)

// TTS 配置
const ttsConfig = ref({
  enabled: true,
  voice: '冰糖',
  mode: 'dj'
})

// 是否可以保存：后端有配置 或 前端有配置 都可以保存
const canSave = computed(() => {
  // 有前端配置（用户输入了值）
  const hasFrontendConfig = Object.keys(configSources.value).some(
    key => configSources.value[key] === 'frontend' && config.value[key]?.trim()
  )
  // 有后端配置（不需要用户输入）
  const hasBackendConfig = Object.keys(configSources.value).some(
    key => configSources.value[key] === 'backend'
  )
  return hasFrontendConfig || hasBackendConfig
})

// 获取输入框显示的值
const getDisplayValue = (field) => {
  // 用户修改过 → 显示用户输入的值
  if (configSources.value[field] === 'frontend') {
    return config.value[field]
  }
  // 后端配置 → 显示脱敏值
  if (configSources.value[field] === 'backend') {
    return maskedBackendValues.value[field] || ''
  }
  return config.value[field] || ''
}

// 加载配置（前端优先，后端作为默认值）
onMounted(async () => {
  loading.value = true
  try {
    // 从配置管理器加载（会自动合并前端和后端配置）
    const { config: mergedConfig, sources, maskedValues } = await configManager.loadWithBackend()

    // 前端有值用前端的；后端有值用脱敏值填充输入框（仅显示用）
    config.value = {
      deepseekKey: mergedConfig.deepseekKey || (sources.deepseekKey === 'backend' ? (maskedValues?.deepseekKey || '') : ''),
      ncmCookie: mergedConfig.ncmCookie || (sources.ncmCookie === 'backend' ? (maskedValues?.ncmCookie || '') : ''),
      xiaomiKey: mergedConfig.xiaomiKey || (sources.xiaomiKey === 'backend' ? (maskedValues?.xiaomiKey || '') : ''),
      openweatherKey: mergedConfig.openweatherKey || (sources.openweatherKey === 'backend' ? (maskedValues?.openweatherKey || '') : ''),
      feishuAppId: mergedConfig.feishuAppId || (sources.feishuAppId === 'backend' ? (maskedValues?.feishuAppId || '') : ''),
      feishuAppSecret: mergedConfig.feishuAppSecret || (sources.feishuAppSecret === 'backend' ? (maskedValues?.feishuAppSecret || '') : '')
    }

    configSources.value = sources
    maskedBackendValues.value = maskedValues || {}

    // 清空 dirty 标记
    dirtyFields.value = new Set()

    // 加载 TTS 配置
    await loadTTSConfig()

    console.log('✅ 配置加载完成:', { config: config.value, sources: configSources.value, masked: maskedBackendValues.value })
  } catch (error) {
    console.error('加载配置失败:', error)
  } finally {
    loading.value = false
  }
})

// 获取配置来源标签
const getSourceLabel = (field) => {
  const source = configSources.value[field]
  if (source === 'frontend') {
    return '本地配置'
  } else if (source === 'backend') {
    return '来自后端'
  }
  return null
}

// 清除验证状态
const clearValidation = (type) => {
  validation.value[type] = { valid: false, message: '' }
}

// 🔥 当用户修改配置时，标记为 dirty 并切换来源
const onConfigChange = (field) => {
  dirtyFields.value.add(field)
  // 来源从 backend 切换为 frontend
  if (configSources.value[field] === 'backend') {
    configSources.value[field] = 'frontend'
  }
  // 清除对应的验证状态
  if (field === 'deepseekKey') {
    clearValidation('deepseek')
  } else if (field === 'ncmCookie') {
    clearValidation('ncm')
  }
}

// 测试 DeepSeek API
const testDeepSeek = async () => {
  validating.value.deepseek = true
  validation.value.deepseek = { valid: false, message: '测试中...' }

  try {
    let result

    // 🔥 后端来源 → 测试后端真实配置；前端来源 → 测试用户输入
    if (configSources.value.deepseekKey === 'backend') {
      result = await configManager.testBackendConfig('deepseek')
    } else {
      if (!config.value.deepseekKey?.trim()) {
        validation.value.deepseek = { valid: false, message: '请先输入 API Key' }
        return
      }
      result = await configManager.validateDeepSeek(config.value.deepseekKey)
    }

    validation.value.deepseek = {
      valid: result.valid,
      message: result.message
    }
  } catch (error) {
    validation.value.deepseek = {
      valid: false,
      message: '测试失败: ' + error.message
    }
  } finally {
    validating.value.deepseek = false
  }
}

// 测试网易云 Cookie
const testNCM = async () => {
  validating.value.ncm = true
  validation.value.ncm = { valid: false, message: '验证中...' }

  try {
    let result

    // 🔥 后端来源 → 测试后端真实配置；前端来源 → 测试用户输入
    if (configSources.value.ncmCookie === 'backend') {
      result = await configManager.testBackendConfig('ncm')
    } else {
      if (!config.value.ncmCookie?.trim()) {
        validation.value.ncm = { valid: false, message: '请先输入 Cookie' }
        return
      }
      result = await configManager.validateNCM(config.value.ncmCookie)
    }

    validation.value.ncm = {
      valid: result.valid,
      message: result.message,
      nickname: result.nickname || '',
      isVIP: result.isVIP || false
    }
  } catch (error) {
    validation.value.ncm = {
      valid: false,
      message: '验证失败: ' + error.message
    }
  } finally {
    validating.value.ncm = false
  }
}

// 导入音乐库
const importMusicLibrary = async (mode) => {
  importing.value = true
  importMode.value = mode
  importResult.value = null

  try {
    const response = await fetch('/api/music/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    })

    const data = await response.json()

    if (response.ok) {
      importResult.value = { success: true, stats: data.stats }
    } else {
      importResult.value = { success: false, error: data.error }
    }
  } catch (error) {
    importResult.value = { success: false, error: '导入失败：' + error.message }
  } finally {
    importing.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  if (!canSave.value) return

  saving.value = true

  try {
    // 🔥 只保存用户修改过的前端配置（dirty fields）
    // 后端来源且未修改的字段跳过，避免脱敏值覆盖真实值
    const configToSave = { configured: true }
    const allFields = ['deepseekKey', 'ncmCookie', 'xiaomiKey', 'openweatherKey', 'feishuAppId', 'feishuAppSecret']

    for (const field of allFields) {
      if (configSources.value[field] === 'frontend' && dirtyFields.value.has(field)) {
        configToSave[field] = config.value[field]
      }
      // 后端来源且未修改 → 跳过
    }

    console.log('💾 保存配置:', configToSave)
    configManager.setAll(configToSave)

    // 通知父组件
    emit('saved')
    emit('close')

    // 刷新页面以应用新配置
    setTimeout(() => {
      window.location.reload()
    }, 500)
  } catch (error) {
    console.error('保存配置失败:', error)
    alert('保存配置失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 加载 TTS 配置
const loadTTSConfig = async () => {
  try {
    const response = await fetch('/api/tts/config')
    if (response.ok) {
      const data = await response.json()
      ttsConfig.value = data.settings
      console.log('✅ TTS 配置加载完成:', ttsConfig.value)
    }
  } catch (error) {
    console.error('加载 TTS 配置失败:', error)
  }
}

// 保存 TTS 配置
const saveTTSConfig = async () => {
  savingTTS.value = true
  try {
    const response = await fetch('/api/tts/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        settings: ttsConfig.value
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ TTS 配置保存成功:', data.settings)
      alert('TTS 配置保存成功！')
    } else {
      const error = await response.json()
      throw new Error(error.error || '保存失败')
    }
  } catch (error) {
    console.error('保存 TTS 配置失败:', error)
    alert('保存 TTS 配置失败: ' + error.message)
  } finally {
    savingTTS.value = false
  }
}

// 重置配置
const resetConfig = () => {
  if (confirm('确定要重置所有配置吗？')) {
    config.value = {
      deepseekKey: '',
      ncmCookie: '',
      xiaomiKey: '',
      openweatherKey: '',
      feishuAppId: '',
      feishuAppSecret: ''
    }
    // 重置来源和 dirty 状态
    for (const key of Object.keys(configSources.value)) {
      if (configSources.value[key] === 'frontend') {
        configSources.value[key] = null
      }
    }
    dirtyFields.value = new Set()
    validation.value = {
      deepseek: { valid: false, message: '' },
      ncm: { valid: false, message: '' }
    }
  }
}

// 清除本地配置
const clearLocalConfig = () => {
  if (confirm('确定要清除本地配置吗？\n\n清除后将使用后端 .env 文件中的配置。')) {
    // 清除 LocalStorage
    configManager.reset()

    // 刷新页面重新加载配置
    window.location.reload()
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: #0a0a0a;
  border: 2px solid #00ff88;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);
  animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #00ff88;
  font-family: 'Courier New', monospace;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  border-color: #ff4444;
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.config-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 16px 0;
  font-family: 'Courier New', monospace;
}

.toggle-icon {
  color: #00ff88;
  font-size: 12px;
  transition: transform 0.2s;
}

.config-item {
  margin-bottom: 20px;
}

.config-label {
  display: block;
  font-size: 13px;
  color: #ccc;
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
}

.required {
  color: #ff4444;
  font-size: 11px;
  margin-left: 4px;
}

.recommended {
  color: #00ff88;
  font-size: 11px;
  margin-left: 4px;
}

.optional {
  color: #888;
  font-size: 11px;
  margin-left: 4px;
}

.source-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  vertical-align: middle;
}

.source-badge.source-backend {
  background: rgba(100, 150, 255, 0.15);
  border: 1px solid rgba(100, 150, 255, 0.4);
  color: #6496ff;
}

.source-badge.source-frontend {
  background: rgba(0, 255, 136, 0.15);
  border: 1px solid rgba(0, 255, 136, 0.4);
  color: #00ff88;
}

.input-group {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.config-input,
.config-textarea {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px 12px;
  color: #fff;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  transition: all 0.2s;
}

.config-input:focus,
.config-textarea:focus {
  outline: none;
  border-color: #00ff88;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.1);
}

/* 后端配置值样式 - 半透明，表示这是只读的脱敏值 */
.config-input.backend-value,
.config-textarea.backend-value {
  color: rgba(100, 150, 255, 0.7);
  border-color: rgba(100, 150, 255, 0.3);
  background: rgba(100, 150, 255, 0.05);
}

.config-input.backend-value:focus,
.config-textarea.backend-value:focus {
  border-color: rgba(100, 150, 255, 0.6);
  box-shadow: 0 0 0 2px rgba(100, 150, 255, 0.1);
}

.config-textarea {
  resize: vertical;
  min-height: 60px;
}

.test-btn,
.help-btn {
  padding: 10px 16px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  border-radius: 8px;
  color: #00ff88;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
}

.test-btn:hover,
.help-btn:hover {
  background: rgba(0, 255, 136, 0.2);
  transform: translateY(-1px);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.validation-message {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
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

.config-hint {
  margin-top: 6px;
  font-size: 11px;
  color: #666;
  font-family: 'Courier New', monospace;
}

.config-hint a {
  color: #00ff88;
  text-decoration: none;
}

.config-hint a:hover {
  text-decoration: underline;
}

.tutorial-box {
  margin-top: 16px;
  padding: 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
}

.tutorial-box h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #00ff88;
  font-family: 'Courier New', monospace;
}

.tutorial-steps {
  margin: 0;
  padding-left: 20px;
  color: #ccc;
  font-size: 12px;
  line-height: 1.8;
}

.tutorial-steps li {
  margin-bottom: 6px;
}

.tutorial-steps code {
  background: #0a0a0a;
  padding: 2px 6px;
  border-radius: 4px;
  color: #00ff88;
  font-family: 'Courier New', monospace;
}

.tutorial-note {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(255, 200, 0, 0.1);
  border: 1px solid rgba(255, 200, 0, 0.3);
  border-radius: 6px;
  color: #ffc800;
  font-size: 11px;
}

.advanced-options {
  padding-top: 16px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #222;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #333;
  color: #888;
}

.btn-secondary:hover {
  border-color: #666;
  color: #ccc;
}

.btn-warning {
  background: transparent;
  border: 1px solid #ff9800;
  color: #ff9800;
}

.btn-warning:hover {
  border-color: #ffa726;
  color: #ffa726;
  background: rgba(255, 152, 0, 0.1);
}

.btn-primary {
  background: #00ff88;
  border: 1px solid #00ff88;
  color: #000;
}

.btn-primary:hover {
  background: #00cc66;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 1000px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

/* 滚动条样式 */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #0a0a0a;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #00ff88;
}

/* TTS 配置面板样式 */
.tts-config-panel {
  margin-top: 16px;
  padding: 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
}

.tts-config-panel h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #00ff88;
  font-family: 'Courier New', monospace;
}

.tts-config-item {
  margin-bottom: 16px;
}

.tts-label {
  display: block;
  font-size: 13px;
  color: #ccc;
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
}

.tts-checkbox {
  margin-right: 8px;
  cursor: pointer;
}

.tts-select {
  width: 100%;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px 12px;
  color: #fff;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  transition: all 0.2s;
}

.tts-select:focus {
  outline: none;
  border-color: #00ff88;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.1);
}

.tts-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-mode-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tts-mode-option {
  display: block;
  padding: 12px;
  background: #0a0a0a;
  border: 2px solid #333;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tts-mode-option:hover:not(.disabled) {
  border-color: #00ff88;
  background: rgba(0, 255, 136, 0.05);
}

.tts-mode-option.active {
  border-color: #00ff88;
  background: rgba(0, 255, 136, 0.1);
}

.tts-mode-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-mode-option input[type="radio"] {
  display: none;
}

.mode-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-icon {
  font-size: 20px;
}

.mode-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  font-family: 'Courier New', monospace;
}

.mode-desc {
  font-size: 11px;
  color: #888;
  margin-left: auto;
  font-family: 'Courier New', monospace;
}

.tts-config-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.btn-save-tts {
  padding: 10px 20px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  border-radius: 8px;
  color: #00ff88;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
}

.btn-save-tts:hover:not(:disabled) {
  background: rgba(0, 255, 136, 0.2);
  transform: translateY(-1px);
}

.btn-save-tts:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 导入音乐库样式 */
.import-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.import-toggle-btn {
  width: 100%;
  padding: 12px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  color: #00ff88;
  cursor: pointer;
  transition: all 0.3s;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
}

.import-toggle-btn:hover:not(:disabled) {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.import-toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-options {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.import-btn {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.import-btn.full {
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  color: #ff6464;
}

.import-btn.incremental {
  background: rgba(100, 150, 255, 0.1);
  border: 1px solid rgba(100, 150, 255, 0.3);
  color: #6496ff;
}

.import-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-result {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.import-result .success {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
}

.import-result .error {
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  color: #ff6464;
}

.import-result ul {
  margin: 8px 0 0 20px;
  list-style: disc;
}

.import-result li {
  margin-bottom: 4px;
}

</style>
