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
      preferences: {}
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
}

export default StateManager;
