// 配置管理工具
const CONFIG_KEY = 'claudio_config'

/**
 * 配置管理类
 */
export class ConfigManager {
  constructor() {
    this.config = this.load()
  }

  /**
   * 加载配置
   */
  load() {
    try {
      const stored = localStorage.getItem(CONFIG_KEY)
      if (!stored) {
        return this.getDefaultConfig()
      }
      return JSON.parse(stored)
    } catch (error) {
      console.error('加载配置失败:', error)
      return this.getDefaultConfig()
    }
  }

  /**
   * 保存配置
   */
  save() {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config))
      return true
    } catch (error) {
      console.error('保存配置失败:', error)
      return false
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      deepseekKey: '',
      ncmCookie: '',
      xiaomiKey: '',
      openweatherKey: '',
      feishuAppId: '',
      feishuAppSecret: '',
      configured: false,
      lastUpdated: null
    }
  }

  /**
   * 设置配置项
   */
  set(key, value) {
    this.config[key] = value
    this.config.lastUpdated = Date.now()
    this.save()
  }

  /**
   * 获取配置项
   */
  get(key) {
    return this.config[key]
  }

  /**
   * 批量设置配置
   */
  setAll(config) {
    this.config = {
      ...this.config,
      ...config,
      lastUpdated: Date.now()
    }
    this.save()
  }

  /**
   * 获取所有配置
   */
  getAll() {
    return { ...this.config }
  }

  /**
   * 检查是否已配置
   */
  isConfigured() {
    return !!(this.config.deepseekKey && this.config.deepseekKey.trim())
  }

  /**
   * 检查必需配置是否完整
   */
  hasRequiredConfig() {
    return !!(this.config.deepseekKey && this.config.deepseekKey.trim())
  }

  /**
   * 重置配置
   */
  reset() {
    this.config = this.getDefaultConfig()
    this.save()
  }

  /**
   * 导出配置（脱敏）
   */
  export() {
    const exported = { ...this.config }

    // 脱敏处理
    if (exported.deepseekKey) {
      exported.deepseekKey = this.maskString(exported.deepseekKey)
    }
    if (exported.ncmCookie) {
      exported.ncmCookie = this.maskString(exported.ncmCookie, 20)
    }
    if (exported.xiaomiKey) {
      exported.xiaomiKey = this.maskString(exported.xiaomiKey)
    }
    if (exported.openweatherKey) {
      exported.openweatherKey = this.maskString(exported.openweatherKey)
    }

    return JSON.stringify(exported, null, 2)
  }

  /**
   * 导入配置
   */
  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString)
      this.setAll(imported)
      return true
    } catch (error) {
      console.error('导入配置失败:', error)
      return false
    }
  }

  /**
   * 脱敏字符串（只显示前后几位）
   */
  maskString(str, showLength = 4) {
    if (!str || str.length <= showLength * 2) {
      return str
    }
    const start = str.substring(0, showLength)
    const end = str.substring(str.length - showLength)
    const middle = '*'.repeat(Math.min(20, str.length - showLength * 2))
    return `${start}${middle}${end}`
  }

  /**
   * 验证 DeepSeek API Key
   */
  async validateDeepSeek(apiKey) {
    try {
      const response = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'deepseek', key: apiKey })
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error('验证 DeepSeek API Key 失败:', error)
      return { valid: false, message: '网络错误' }
    }
  }

  /**
   * 验证网易云 Cookie
   */
  async validateNCM(cookie) {
    try {
      const response = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ncm', cookie: cookie })
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error('验证网易云 Cookie 失败:', error)
      return { valid: false, message: '网络错误' }
    }
  }

  /**
   * 测试后端配置（不发送配置值，直接测试后端 .env）
   */
  async testBackendConfig(type) {
    try {
      const response = await fetch('/api/config/test-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type })
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error('测试后端配置失败:', error)
      return { valid: false, message: '网络错误' }
    }
  }

  /**
   * 获取配置状态（包含后端配置值）
   */
  async getStatus() {
    try {
      const response = await fetch('/api/config/status')
      const data = await response.json()
      return data
    } catch (error) {
      console.error('获取配置状态失败:', error)
      return null
    }
  }

  /**
   * 从后端加载配置状态
   * 返回配置来源信息（不返回实际值，后端会自动使用 .env 中的配置）
   */
  async loadWithBackend() {
    try {
      // 获取后端配置状态
      const backendStatus = await this.getStatus()
      if (!backendStatus) {
        return { config: this.config, sources: {} }
      }

      // 构建配置来源信息和脱敏值
      const sources = {
        deepseekKey: null,
        ncmCookie: null,
        xiaomiKey: null,
        openweatherKey: null,
        feishuAppId: null,
        feishuAppSecret: null
      }

      // 脱敏的后端值（用于显示，不参与实际调用）
      const maskedValues = {
        deepseekKey: null,
        ncmCookie: null,
        xiaomiKey: null,
        openweatherKey: null,
        feishuAppId: null,
        feishuAppSecret: null
      }

      // 前端有值 → 来源为 frontend；否则检查后端
      // DeepSeek API Key
      if (this.config.deepseekKey) {
        sources.deepseekKey = 'frontend'
      } else if (backendStatus.deepseek?.configured) {
        sources.deepseekKey = 'backend'
        maskedValues.deepseekKey = backendStatus.deepseek.maskedValue
      }

      // 网易云 Cookie
      if (this.config.ncmCookie) {
        sources.ncmCookie = 'frontend'
      } else if (backendStatus.ncm?.configured) {
        sources.ncmCookie = 'backend'
        maskedValues.ncmCookie = backendStatus.ncm.maskedValue
      }

      // 小米 MiMo TTS API Key
      if (this.config.xiaomiKey) {
        sources.xiaomiKey = 'frontend'
      } else if (backendStatus.xiaomi?.configured) {
        sources.xiaomiKey = 'backend'
        maskedValues.xiaomiKey = backendStatus.xiaomi.maskedValue
      }

      // OpenWeather API Key
      if (this.config.openweatherKey) {
        sources.openweatherKey = 'frontend'
      } else if (backendStatus.openweather?.configured) {
        sources.openweatherKey = 'backend'
        maskedValues.openweatherKey = backendStatus.openweather.maskedValue
      }

      // 飞书配置
      if (this.config.feishuAppId) {
        sources.feishuAppId = 'frontend'
      } else if (backendStatus.feishu?.configured) {
        sources.feishuAppId = 'backend'
        maskedValues.feishuAppId = backendStatus.feishu.maskedAppId
      }

      if (this.config.feishuAppSecret) {
        sources.feishuAppSecret = 'frontend'
      } else if (backendStatus.feishu?.configured) {
        sources.feishuAppSecret = 'backend'
        maskedValues.feishuAppSecret = backendStatus.feishu.maskedAppSecret
      }

      return { config: this.config, sources, maskedValues }
    } catch (error) {
      console.error('从后端加载配置失败:', error)
      return { config: this.config, sources: {} }
    }
  }
}

// 创建单例
const configManager = new ConfigManager()

export default configManager

// 导出便捷方法
export const getConfig = (key) => configManager.get(key)
export const setConfig = (key, value) => configManager.set(key, value)
export const isConfigured = () => configManager.isConfigured()
export const validateDeepSeek = (key) => configManager.validateDeepSeek(key)
export const validateNCM = (cookie) => configManager.validateNCM(cookie)
