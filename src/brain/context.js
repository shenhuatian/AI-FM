// 上下文组装器 - 将各种信息片段组装成完整的上下文
import fs from 'fs/promises';

export class ContextBuilder {
  constructor(state, weatherService = null, calendarService = null) {
    this.state = state;
    this.weatherService = weatherService;
    this.calendarService = calendarService;
  }

  /**
   * 构建完整的上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 完整上下文
   */
  async build(options = {}) {
    const context = {
      // 1. 时间信息
      time: this.getTimeInfo(),

      // 2. 用户输入
      userInput: options.userInput || null,

      // 3. 心情状态
      mood: options.mood || null,

      // 4. 播放历史
      playHistory: this.state.getPlayHistory(10),

      // 5. 天气信息（如果可用）
      weather: await this.getWeather(),

      // 6. 日程信息（如果可用）
      calendar: await this.getCalendar(),

      // 7. 用户偏好
      preferences: this.getUserPreferences()
    };

    return context;
  }

  /**
   * 获取时间信息
   * @returns {string}
   */
  getTimeInfo() {
    const now = new Date();
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      timeZone: 'Asia/Shanghai'
    };

    return now.toLocaleString('zh-CN', options);
  }

  /**
   * 获取天气信息
   * @returns {Promise<Object|null>}
   */
  async getWeather() {
    if (!this.weatherService) {
      return null;
    }

    try {
      return await this.weatherService.getCurrentWeather();
    } catch (error) {
      console.error('获取天气失败:', error);
      return null;
    }
  }

  /**
   * 获取日程信息
   * @returns {Promise<Array|null>}
   */
  async getCalendar() {
    if (!this.calendarService) {
      return null;
    }

    try {
      return await this.calendarService.getTodayEvents();
    } catch (error) {
      console.error('获取日程失败:', error);
      return null;
    }
  }

  /**
   * 获取用户偏好
   * @returns {Object}
   */
  getUserPreferences() {
    return {
      favoriteGenres: this.state.getPreference('favoriteGenres') || [],
      favoriteArtists: this.state.getPreference('favoriteArtists') || [],
      dislikedGenres: this.state.getPreference('dislikedGenres') || []
    };
  }

  /**
   * 获取当前场景
   * @returns {string}
   */
  getCurrentScene() {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 12) return 'work_morning';
    if (hour >= 12 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 18) return 'work_afternoon';
    if (hour >= 18 && hour < 21) return 'evening';
    if (hour >= 21 && hour < 23) return 'night';
    return 'late_night';
  }

  /**
   * 根据场景获取推荐的音乐类型
   * @returns {string}
   */
  getSceneRecommendation() {
    const scene = this.getCurrentScene();
    const recommendations = {
      morning: '轻快、唤醒的音乐',
      work_morning: '专注、轻音乐',
      lunch: '轻松、愉快的音乐',
      work_afternoon: '专注、轻音乐',
      evening: '放松、舒缓的音乐',
      night: '安静、温柔的音乐',
      late_night: '安静、助眠的音乐'
    };

    return recommendations[scene] || '适合当前时间的音乐';
  }
}

export default ContextBuilder;
