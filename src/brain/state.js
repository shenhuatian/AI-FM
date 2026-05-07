// 状态管理 - 使用JSON文件持久化
import fs from 'fs/promises';
import path from 'path';

export class StateManager {
  constructor(dataDir = 'data') {
    this.dataDir = dataDir;
    this.stateFile = path.join(dataDir, 'state.json');
    this.state = {
      plays: [],
      messages: [],
      plans: {},
      preferences: {},
      feedback: {},      // 用户反馈（喜欢/不喜欢）
      favorites: [],     // 用户收藏
      proactiveSettings: {  // 主动对话设置
        level: 'medium',    // 'quiet' | 'medium' | 'active'
        quietHours: { start: 23, end: 7 }
      },
      proactiveMessages: [],  // 主动消息历史
      proactiveStats: {       // 主动对话统计
        responseRate: 1.0,
        lastUpdate: Date.now()
      },
      ttsSettings: {      // TTS 语音合成设置
        enabled: true,    // 是否启用 TTS
        voice: '冰糖',    // 音色：冰糖、茉莉、苏打、白桦、Mia、Chloe、Milo、Dean
        mode: 'dj'        // 模式：'dj' | 'music' | 'quiet'
      },
      playModeSettings: {  // 播放模式设置
        mode: 'manual'     // 模式：'manual' | 'auto' | 'loop'
      }
    };
    this.init();
  }

  /**
   * 初始化状态管理器
   */
  async init() {
    try {
      // 确保数据目录存在
      await fs.mkdir(this.dataDir, { recursive: true });

      // 尝试加载现有状态
      try {
        const data = await fs.readFile(this.stateFile, 'utf-8');
        this.state = JSON.parse(data);
        console.log('✅ 状态已加载');
      } catch (error) {
        // 文件不存在，使用默认状态
        console.log('📝 创建新的状态文件');
        await this.save();
      }
    } catch (error) {
      console.error('初始化状态管理器失败:', error);
    }
  }

  /**
   * 保存状态到文件
   */
  async save() {
    try {
      await fs.writeFile(
        this.stateFile,
        JSON.stringify(this.state, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('保存状态失败:', error);
    }
  }

  /**
   * 记录播放历史
   * @param {Object} song - 歌曲信息
   * @param {Object} context - 播放上下文
   */
  async addPlay(song, context = {}) {
    const play = {
      song_id: song.id,
      song_name: song.name,
      artist: song.artist,
      album: song.album || '',
      played_at: new Date().toISOString(),
      context: context,
      completed: false, // 是否完整播放
      skipped: false // 是否被跳过
    };

    this.state.plays.push(play);

    // 只保留最近500条记录
    if (this.state.plays.length > 500) {
      this.state.plays = this.state.plays.slice(-500);
    }

    // 自动学习用户偏好
    await this.learnFromPlay(song, context);

    await this.save();
  }

  /**
   * 标记歌曲为完整播放
   * @param {string} songId - 歌曲ID
   */
  async markCompleted(songId) {
    const recentPlay = this.state.plays
      .slice()
      .reverse()
      .find(p => p.song_id === songId);

    if (recentPlay) {
      recentPlay.completed = true;
      await this.save();
    }
  }

  /**
   * 标记歌曲为跳过
   * @param {string} songId - 歌曲ID
   */
  async markSkipped(songId) {
    const recentPlay = this.state.plays
      .slice()
      .reverse()
      .find(p => p.song_id === songId);

    if (recentPlay) {
      recentPlay.skipped = true;
      await this.save();
    }
  }

  /**
   * 从播放行为中学习用户偏好
   * @param {Object} song - 歌曲信息
   * @param {Object} context - 播放上下文
   */
  async learnFromPlay(song, context) {
    // 统计艺术家播放次数
    const artistKey = `artist_${song.artist}`;
    const currentCount = this.state.preferences[artistKey]?.value || 0;
    await this.setPreference(artistKey, currentCount + 1);

    // 记录时间段偏好
    const hour = new Date().getHours();
    const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const timeKey = `time_${timeSlot}`;
    const timePrefs = this.state.preferences[timeKey]?.value || [];

    // 添加到时间段偏好，保留最近20首
    timePrefs.push({
      song: song.name,
      artist: song.artist,
      timestamp: new Date().toISOString()
    });

    if (timePrefs.length > 20) {
      timePrefs.shift();
    }

    await this.setPreference(timeKey, timePrefs);
  }

  /**
   * 获取用户最喜欢的艺术家
   * @param {number} limit - 返回数量
   * @returns {Array} 艺术家列表
   */
  getFavoriteArtists(limit = 10) {
    const artistPrefs = Object.entries(this.state.preferences)
      .filter(([key]) => key.startsWith('artist_'))
      .map(([key, data]) => ({
        artist: key.replace('artist_', ''),
        count: data.value
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return artistPrefs;
  }

  /**
   * 获取时间段偏好
   * @param {string} timeSlot - 时间段 (morning/afternoon/evening)
   * @returns {Array} 该时间段常听的歌曲
   */
  getTimeSlotPreference(timeSlot) {
    const timeKey = `time_${timeSlot}`;
    return this.state.preferences[timeKey]?.value || [];
  }

  /**
   * 获取推荐权重（用于AI推荐）
   * @returns {Object} 推荐权重数据
   */
  getRecommendationWeights() {
    return {
      favoriteArtists: this.getFavoriteArtists(5),
      currentTimeSlot: this.getCurrentTimeSlot(),
      timeSlotPrefs: this.getTimeSlotPreference(this.getCurrentTimeSlot()),
      recentPlays: this.getRecentSongs(10)
    };
  }

  /**
   * 获取当前时间段
   * @returns {string} 时间段
   */
  getCurrentTimeSlot() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * 获取播放历史
   * @param {number} limit - 返回数量
   * @returns {Array} 播放历史
   */
  getPlayHistory(limit = 50) {
    return this.state.plays.slice(-limit).reverse();
  }

  /**
   * 获取所有播放记录
   * @returns {Array} 所有播放记录
   */
  getPlays() {
    return this.state.plays;
  }

  /**
   * 获取最近播放的歌曲（去重）
   * @param {number} limit - 返回数量
   * @returns {Array} 最近播放的歌曲
   */
  getRecentSongs(limit = 20) {
    const seen = new Set();
    const unique = [];

    for (let i = this.state.plays.length - 1; i >= 0; i--) {
      const play = this.state.plays[i];
      if (!seen.has(play.song_id)) {
        seen.add(play.song_id);
        unique.push(play);
        if (unique.length >= limit) break;
      }
    }

    return unique;
  }

  /**
   * 保存用户偏好
   * @param {string} key - 偏好键
   * @param {any} value - 偏好值
   */
  async setPreference(key, value) {
    this.state.preferences[key] = {
      value: value,
      updated_at: new Date().toISOString()
    };
    await this.save();
  }

  /**
   * 获取用户偏好
   * @param {string} key - 偏好键
   * @returns {any} 偏好值
   */
  getPreference(key) {
    return this.state.preferences[key]?.value || null;
  }

  /**
   * 保存对话消息
   * @param {string} role - 角色 (user/assistant)
   * @param {string} content - 消息内容
   */
  async addMessage(role, content) {
    const message = {
      role: role,
      content: content,
      created_at: new Date().toISOString()
    };

    this.state.messages.push(message);

    // 只保留最近100条消息
    if (this.state.messages.length > 100) {
      this.state.messages = this.state.messages.slice(-100);
    }

    await this.save();
  }

  /**
   * 获取对话历史
   * @param {number} limit - 返回数量
   * @returns {Array} 对话历史
   */
  getMessages(limit = 20) {
    return this.state.messages.slice(-limit);
  }

  /**
   * 获取对话历史（用于DeepSeek API）
   * @param {number} limit - 限制数量
   * @returns {Array} 对话历史
   */
  getConversationHistory(limit = 10) {
    return this.state.messages.slice(-limit).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * 保存今日计划
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} plan - 计划内容
   */
  async savePlan(date, plan) {
    this.state.plans[date] = {
      plan: plan,
      created_at: new Date().toISOString()
    };
    await this.save();
  }

  /**
   * 获取今日计划
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @returns {string|null} 计划内容
   */
  getPlan(date) {
    return this.state.plans[date]?.plan || null;
  }

  /**
   * 清理过期数据
   * @param {number} daysToKeep - 保留天数
   */
  async cleanup(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTime = cutoffDate.toISOString();

    // 清理旧的播放记录
    this.state.plays = this.state.plays.filter(
      play => play.played_at > cutoffTime
    );

    // 清理旧的消息
    this.state.messages = this.state.messages.filter(
      msg => msg.created_at > cutoffTime
    );

    // 清理旧的计划
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    for (const date in this.state.plans) {
      if (date < cutoffDateStr) {
        delete this.state.plans[date];
      }
    }

    await this.save();
    console.log('🧹 已清理过期数据');
  }

  // ==================== 反馈管理 ====================

  /**
   * 添加用户反馈
   * @param {string} songId - 歌曲ID
   * @param {string} songName - 歌曲名称
   * @param {string} artist - 艺术家
   * @param {string} feedback - 反馈类型 ('like' | 'dislike')
   */
  async addFeedback(songId, songName, artist, feedback) {
    if (!this.state.feedback) {
      this.state.feedback = {};
    }

    this.state.feedback[songId] = {
      songId,
      songName,
      artist,
      feedback,
      timestamp: new Date().toISOString()
    };

    await this.save();
    console.log(`✅ 反馈已保存: ${songName} - ${feedback}`);
  }

  /**
   * 获取歌曲反馈
   * @param {string} songId - 歌曲ID
   * @returns {Object|null} 反馈对象
   */
  getFeedback(songId) {
    return this.state.feedback?.[songId] || null;
  }

  /**
   * 移除歌曲反馈
   * @param {string} songId - 歌曲ID
   */
  async removeFeedback(songId) {
    if (this.state.feedback && this.state.feedback[songId]) {
      delete this.state.feedback[songId];
      await this.save();
      console.log(`🗑️ 已移除反馈: ${songId}`);
    }
  }

  /**
   * 获取所有反馈
   * @returns {Object} 所有反馈数据
   */
  getAllFeedback() {
    return this.state.feedback || {};
  }

  /**
   * 获取喜欢的歌曲列表
   * @returns {Array} 喜欢的歌曲列表
   */
  getLikedSongs() {
    if (!this.state.feedback) return [];
    return Object.values(this.state.feedback)
      .filter(item => item.feedback === 'like')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * 获取不喜欢的歌曲列表
   * @returns {Array} 不喜欢的歌曲列表
   */
  getDislikedSongs() {
    if (!this.state.feedback) return [];
    return Object.values(this.state.feedback)
      .filter(item => item.feedback === 'dislike')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // ==================== 收藏管理 ====================

  /**
   * 添加收藏
   * @param {Object} song - 歌曲对象
   * @returns {boolean} 是否添加成功
   */
  async addFavorite(song) {
    if (!this.state.favorites) {
      this.state.favorites = [];
    }

    // 检查是否已收藏
    if (this.state.favorites.some(f => f.id === song.id)) {
      console.log(`⚠️ 歌曲已在收藏夹中: ${song.name}`);
      return false;
    }

    const favoriteItem = {
      id: song.id,
      name: song.name,
      artist: song.artist,
      album: song.album || '',
      url: song.url,
      albumPic: song.albumPic || null,
      addedAt: new Date().toISOString()
    };

    this.state.favorites.unshift(favoriteItem);
    await this.save();
    console.log(`⭐ 已收藏: ${song.name} - ${song.artist}`);
    return true;
  }

  /**
   * 移除收藏
   * @param {string} songId - 歌曲ID
   */
  async removeFavorite(songId) {
    if (!this.state.favorites) return;

    const originalLength = this.state.favorites.length;
    this.state.favorites = this.state.favorites.filter(f => f.id !== songId);

    if (this.state.favorites.length < originalLength) {
      await this.save();
      console.log(`🗑️ 已从收藏夹移除: ${songId}`);
    }
  }

  /**
   * 获取所有收藏
   * @returns {Array} 收藏列表
   */
  getFavorites() {
    return this.state.favorites || [];
  }

  /**
   * 检查歌曲是否已收藏
   * @param {string} songId - 歌曲ID
   * @returns {boolean}
   */
  isFavorited(songId) {
    if (!this.state.favorites) return false;
    return this.state.favorites.some(f => f.id === songId);
  }

  /**
   * 清空收藏夹
   */
  async clearFavorites() {
    this.state.favorites = [];
    await this.save();
    console.log('🗑️ 已清空收藏夹');
  }

  // ==================== 主动对话管理 ====================

  /**
   * 获取主动对话设置
   * @returns {Object} 主动对话设置
   */
  getProactiveSettings() {
    if (!this.state.proactiveSettings) {
      this.state.proactiveSettings = {
        level: 'medium',
        quietHours: { start: 23, end: 7 }
      };
    }
    return this.state.proactiveSettings;
  }

  /**
   * 更新主动对话设置
   * @param {Object} settings - 新的设置
   */
  async updateProactiveSettings(settings) {
    this.state.proactiveSettings = {
      ...this.state.proactiveSettings,
      ...settings
    };
    await this.save();
    console.log('✅ 主动对话设置已更新:', settings);
  }

  /**
   * 添加主动消息记录
   * @param {Object} decision - AI的决策结果
   */
  async addProactiveMessage(decision) {
    if (!this.state.proactiveMessages) {
      this.state.proactiveMessages = [];
    }

    const message = {
      message: decision.message,
      intent: decision.intent,
      songs: decision.songs || [],
      timestamp: new Date().toISOString(),
      responded: false  // 用户是否响应
    };

    this.state.proactiveMessages.push(message);

    // 只保留最近50条
    if (this.state.proactiveMessages.length > 50) {
      this.state.proactiveMessages = this.state.proactiveMessages.slice(-50);
    }

    await this.save();
  }

  /**
   * 标记最近的主动消息为已响应
   */
  async markProactiveMessageResponded() {
    if (!this.state.proactiveMessages || this.state.proactiveMessages.length === 0) {
      return;
    }

    const lastMessage = this.state.proactiveMessages[this.state.proactiveMessages.length - 1];
    if (!lastMessage.responded) {
      lastMessage.responded = true;
      await this.save();
      console.log('✅ 标记主动消息为已响应');
    }
  }

  /**
   * 获取主动消息历史
   * @param {number} limit - 返回数量
   * @returns {Array} 主动消息历史
   */
  getProactiveMessages(limit = 10) {
    if (!this.state.proactiveMessages) {
      return [];
    }
    return this.state.proactiveMessages.slice(-limit).reverse();
  }

  /**
   * 更新主动对话统计
   * @param {Object} stats - 统计数据
   */
  async updateProactiveStats(stats) {
    if (!this.state.proactiveStats) {
      this.state.proactiveStats = {
        responseRate: 1.0,
        lastUpdate: Date.now()
      };
    }

    this.state.proactiveStats = {
      ...this.state.proactiveStats,
      ...stats
    };

    await this.save();
  }

  /**
   * 获取主动对话统计
   * @returns {Object} 统计数据
   */
  getProactiveStats() {
    if (!this.state.proactiveStats) {
      return {
        responseRate: 1.0,
        lastUpdate: Date.now()
      };
    }
    return this.state.proactiveStats;
  }

  // ==================== TTS 配置管理 ====================

  /**
   * 获取 TTS 配置
   * @returns {Object} TTS 配置
   */
  getTTSSettings() {
    if (!this.state.ttsSettings) {
      this.state.ttsSettings = {
        enabled: true,
        voice: '冰糖',
        mode: 'dj'
      };
    }
    return this.state.ttsSettings;
  }

  /**
   * 更新 TTS 配置
   * @param {Object} settings - TTS 配置
   * @param {boolean} settings.enabled - 是否启用
   * @param {string} settings.voice - 音色
   * @param {string} settings.mode - 模式
   */
  async updateTTSSettings(settings) {
    if (!this.state.ttsSettings) {
      this.state.ttsSettings = {
        enabled: true,
        voice: '冰糖',
        mode: 'dj'
      };
    }

    this.state.ttsSettings = {
      ...this.state.ttsSettings,
      ...settings
    };

    await this.save();
    console.log('✅ TTS 配置已更新:', this.state.ttsSettings);
  }

  /**
   * 获取播放模式配置
   * @returns {Object} 播放模式配置
   */
  getPlayModeSettings() {
    if (!this.state.playModeSettings) {
      this.state.playModeSettings = {
        mode: 'manual'
      };
    }
    return this.state.playModeSettings;
  }

  /**
   * 更新播放模式配置
   * @param {Object} settings - 播放模式配置
   * @param {string} settings.mode - 模式：'manual' | 'auto' | 'loop'
   */
  async updatePlayModeSettings(settings) {
    if (!this.state.playModeSettings) {
      this.state.playModeSettings = {
        mode: 'manual'
      };
    }

    this.state.playModeSettings = {
      ...this.state.playModeSettings,
      ...settings
    };

    await this.save();
    console.log('✅ 播放模式配置已更新:', this.state.playModeSettings);
  }
}

export default StateManager;
