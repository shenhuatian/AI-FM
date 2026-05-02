// LocalStorage 管理模块

const STORAGE_KEY = 'claudio_fm_data'
const EXPIRY_DAYS = 7

export class StorageManager {
  constructor() {
    this.data = this.load()
  }

  // 加载数据
  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return this.getDefaultData()
      }

      const data = JSON.parse(stored)

      // 检查是否过期
      if (this.isExpired(data)) {
        console.log('📦 数据已过期，清除旧数据')
        return this.getDefaultData()
      }

      // 清理过期的对话
      data.conversations = this.cleanExpiredConversations(data.conversations)

      console.log('📦 从 LocalStorage 恢复数据')
      return data
    } catch (error) {
      console.error('❌ 加载数据失败:', error)
      return this.getDefaultData()
    }
  }

  // 保存数据
  save() {
    try {
      this.data.lastUpdated = Date.now()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch (error) {
      console.error('❌ 保存数据失败:', error)
    }
  }

  // 获取默认数据结构
  getDefaultData() {
    return {
      conversations: [],
      currentPlaylist: [],
      currentIndex: 0,
      lastUpdated: Date.now(),
      version: '1.0'
    }
  }

  // 检查是否过期
  isExpired(data) {
    if (!data.lastUpdated) return true
    const now = Date.now()
    const expiryTime = EXPIRY_DAYS * 24 * 60 * 60 * 1000
    return (now - data.lastUpdated) > expiryTime
  }

  // 清理过期的对话（7天前）
  cleanExpiredConversations(conversations) {
    const now = Date.now()
    const expiryTime = EXPIRY_DAYS * 24 * 60 * 60 * 1000

    return conversations.filter(conv => {
      return (now - conv.timestamp) < expiryTime
    })
  }

  // 添加消息
  addMessage(type, text, songs = null, reason = null) {
    const today = this.getToday()
    let conversation = this.data.conversations.find(c => c.date === today)

    if (!conversation) {
      conversation = {
        id: `conv_${Date.now()}`,
        date: today,
        timestamp: Date.now(),
        messages: []
      }
      this.data.conversations.push(conversation)
    }

    conversation.messages.push({
      type,
      text,
      songs,
      reason,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    })

    // 限制每个对话最多100条消息
    if (conversation.messages.length > 100) {
      conversation.messages = conversation.messages.slice(-100)
    }

    this.save()
  }

  // 获取所有消息（用于显示）
  getAllMessages() {
    const messages = []
    this.data.conversations.forEach(conv => {
      messages.push(...conv.messages)
    })
    return messages
  }

  // 获取今天的日期字符串
  getToday() {
    const now = new Date()
    return now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  // 保存播放列表
  savePlaylist(playlist, currentIndex) {
    this.data.currentPlaylist = playlist
    this.data.currentIndex = currentIndex
    this.save()
  }

  // 获取播放列表
  getPlaylist() {
    return {
      playlist: this.data.currentPlaylist || [],
      currentIndex: this.data.currentIndex || 0
    }
  }

  // 清除所有数据
  clear() {
    localStorage.removeItem(STORAGE_KEY)
    this.data = this.getDefaultData()
    console.log('🗑️ 已清除所有历史数据')
  }

  // 清除聊天记录（保留播放列表）
  clearMessages() {
    this.data.conversations = []
    this.save()
    console.log('🗑️ 已清除聊天记录')
  }

  // 获取按日期分组的对话
  getConversationsByDate() {
    return this.data.conversations.map(conv => ({
      ...conv,
      displayDate: this.formatDate(conv.date)
    }))
  }

  // 格式化日期显示
  formatDate(dateStr) {
    const today = this.getToday()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

    if (dateStr === today) return '今天'
    if (dateStr === yesterday) return '昨天'
    return dateStr
  }
}

export default new StorageManager()
