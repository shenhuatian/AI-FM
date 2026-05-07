// 用户画像系统
import fs from 'fs/promises';
import path from 'path';

export class UserProfile {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.profilePath = 'data/user-profile.json';
    this.profile = null;
  }

  /**
   * 初始化用户画像
   */
  async init() {
    try {
      // 尝试加载已有的画像
      const data = await fs.readFile(this.profilePath, 'utf-8');
      this.profile = JSON.parse(data);
      console.log('✅ 用户画像已加载');
    } catch (error) {
      // 如果文件不存在，创建默认画像
      console.log('📝 创建新的用户画像');
      this.profile = this.createDefaultProfile();
      await this.save();
    }
  }

  /**
   * 创建默认画像
   */
  createDefaultProfile() {
    return {
      // 长期偏好（从网易云 + 历史对话学习）
      longTerm: {
        favoriteArtists: [],      // 喜欢的艺术家
        favoriteGenres: [],        // 喜欢的风格
        favoriteLanguages: [],     // 喜欢的语种
        avoidance: [],             // 不喜欢的内容
        energyPreference: null,    // 能量偏好: high / medium / low
        freshnessPreference: 'mixed', // 新鲜度偏好: fresh / familiar / mixed
        scenePreferences: {}       // 场景偏好: { "工作": ["民谣"], "运动": ["摇滚"] }
      },

      // 短期偏好（最近几次对话）
      shortTerm: {
        recentMood: null,          // 最近的心情
        recentRequests: [],        // 最近的请求（最多保留 10 条）
        recentFeedback: []         // 最近的反馈（最多保留 20 条）
      },

      // 即时状态（当前对话）
      current: {
        mood: null,                // 当前心情
        scene: null,               // 当前场景
        weather: null,             // 当前天气
        time: null,                // 当前时间
        avoidance: []              // 当前想避免的内容
      },

      // 元数据
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * 获取完整画像
   */
  getProfile() {
    return this.profile;
  }

  /**
   * 更新长期偏好
   */
  updateLongTerm(updates) {
    if (!this.profile) {
      console.error('❌ 用户画像未初始化');
      return;
    }

    // 添加喜欢的艺术家
    if (updates.addFavoriteArtist) {
      if (!this.profile.longTerm.favoriteArtists.includes(updates.addFavoriteArtist)) {
        this.profile.longTerm.favoriteArtists.push(updates.addFavoriteArtist);
        console.log(`✅ 添加喜欢的艺术家: ${updates.addFavoriteArtist}`);
      }
    }

    // 添加喜欢的风格
    if (updates.addFavoriteGenre) {
      if (!this.profile.longTerm.favoriteGenres.includes(updates.addFavoriteGenre)) {
        this.profile.longTerm.favoriteGenres.push(updates.addFavoriteGenre);
        console.log(`✅ 添加喜欢的风格: ${updates.addFavoriteGenre}`);
      }
    }

    // 添加喜欢的语种
    if (updates.addFavoriteLanguage) {
      if (!this.profile.longTerm.favoriteLanguages.includes(updates.addFavoriteLanguage)) {
        this.profile.longTerm.favoriteLanguages.push(updates.addFavoriteLanguage);
        console.log(`✅ 添加喜欢的语种: ${updates.addFavoriteLanguage}`);
      }
    }

    // 添加不喜欢的内容
    if (updates.addAvoidance) {
      if (!this.profile.longTerm.avoidance.includes(updates.addAvoidance)) {
        this.profile.longTerm.avoidance.push(updates.addAvoidance);
        console.log(`✅ 添加不喜欢的内容: ${updates.addAvoidance}`);
      }
    }

    // 更新能量偏好
    if (updates.energyPreference) {
      this.profile.longTerm.energyPreference = updates.energyPreference;
      console.log(`✅ 更新能量偏好: ${updates.energyPreference}`);
    }

    // 更新新鲜度偏好
    if (updates.freshnessPreference) {
      this.profile.longTerm.freshnessPreference = updates.freshnessPreference;
      console.log(`✅ 更新新鲜度偏好: ${updates.freshnessPreference}`);
    }

    // 更新场景偏好
    if (updates.scenePreference) {
      const { scene, genres } = updates.scenePreference;
      this.profile.longTerm.scenePreferences[scene] = genres;
      console.log(`✅ 更新场景偏好: ${scene} → ${genres.join(', ')}`);
    }

    this.profile.metadata.updatedAt = new Date().toISOString();
    this.save();
  }

  /**
   * 更新短期偏好
   */
  updateShortTerm(updates) {
    if (!this.profile) {
      console.error('❌ 用户画像未初始化');
      return;
    }

    // 更新最近的心情
    if (updates.recentMood) {
      this.profile.shortTerm.recentMood = updates.recentMood;
    }

    // 添加最近的请求
    if (updates.addRecentRequest) {
      this.profile.shortTerm.recentRequests.unshift({
        request: updates.addRecentRequest,
        timestamp: new Date().toISOString()
      });

      // 只保留最近 10 条
      if (this.profile.shortTerm.recentRequests.length > 10) {
        this.profile.shortTerm.recentRequests = this.profile.shortTerm.recentRequests.slice(0, 10);
      }
    }

    // 添加最近的反馈
    if (updates.addRecentFeedback) {
      this.profile.shortTerm.recentFeedback.unshift({
        ...updates.addRecentFeedback,
        timestamp: new Date().toISOString()
      });

      // 只保留最近 20 条
      if (this.profile.shortTerm.recentFeedback.length > 20) {
        this.profile.shortTerm.recentFeedback = this.profile.shortTerm.recentFeedback.slice(0, 20);
      }
    }

    this.profile.metadata.updatedAt = new Date().toISOString();
    this.save();
  }

  /**
   * 更新即时状态
   */
  updateCurrent(updates) {
    if (!this.profile) {
      console.error('❌ 用户画像未初始化');
      return;
    }

    if (updates.mood !== undefined) {
      this.profile.current.mood = updates.mood;
    }

    if (updates.scene !== undefined) {
      this.profile.current.scene = updates.scene;
    }

    if (updates.weather !== undefined) {
      this.profile.current.weather = updates.weather;
    }

    if (updates.time !== undefined) {
      this.profile.current.time = updates.time;
    }

    if (updates.avoidance !== undefined) {
      this.profile.current.avoidance = updates.avoidance;
    }

    // 即时状态不需要保存到文件（会话级别）
  }

  /**
   * 从网易云数据初始化长期偏好
   */
  async initFromNeteaseData(neteaseData) {
    if (!neteaseData) {
      console.log('⚠️ 没有网易云数据');
      return;
    }

    console.log('📊 从网易云数据初始化用户画像');

    // 从听歌排行中提取喜欢的艺术家
    if (neteaseData.topSongs && neteaseData.topSongs.length > 0) {
      const artistCount = {};

      neteaseData.topSongs.forEach(song => {
        const artist = song.artist.split('/')[0]; // 取第一个艺术家
        artistCount[artist] = (artistCount[artist] || 0) + song.playCount;
      });

      // 取播放次数最多的前 10 位艺术家
      const topArtists = Object.entries(artistCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([artist]) => artist);

      this.profile.longTerm.favoriteArtists = topArtists;
      console.log(`✅ 初始化喜欢的艺术家: ${topArtists.join(', ')}`);
    }

    // 从用户歌单中提取喜欢的风格
    if (neteaseData.playlists && neteaseData.playlists.length > 0) {
      const genres = new Set();

      neteaseData.playlists.forEach(playlist => {
        if (playlist.tags && playlist.tags.length > 0) {
          playlist.tags.forEach(tag => genres.add(tag));
        }
      });

      this.profile.longTerm.favoriteGenres = Array.from(genres).slice(0, 10);
      console.log(`✅ 初始化喜欢的风格: ${this.profile.longTerm.favoriteGenres.join(', ')}`);
    }

    this.profile.metadata.updatedAt = new Date().toISOString();
    await this.save();
  }

  /**
   * 从对话中学习偏好
   */
  learnFromConversation(userMessage, intent) {
    if (!intent) return;

    // 学习艺术家偏好
    if (intent.artist) {
      this.updateLongTerm({ addFavoriteArtist: intent.artist });
    }

    // 学习风格偏好
    if (intent.style && intent.style.length > 0) {
      intent.style.forEach(genre => {
        this.updateLongTerm({ addFavoriteGenre: genre });
      });
    }

    // 学习不喜欢的内容
    if (intent.avoidance && intent.avoidance.length > 0) {
      intent.avoidance.forEach(avoid => {
        this.updateLongTerm({ addAvoidance: avoid });
      });
    }

    // 学习新鲜度偏好
    if (intent.freshness) {
      this.updateLongTerm({ freshnessPreference: intent.freshness });
    }

    // 更新短期偏好
    this.updateShortTerm({
      recentMood: intent.mood,
      addRecentRequest: userMessage
    });

    // 更新即时状态
    this.updateCurrent({
      mood: intent.mood,
      avoidance: intent.avoidance || []
    });
  }

  /**
   * 从反馈中学习
   */
  learnFromFeedback(song, feedback) {
    if (!song || !feedback) return;

    console.log(`📝 学习反馈: ${song.name} - ${song.artist} → ${feedback}`);

    // 添加到短期反馈
    this.updateShortTerm({
      addRecentFeedback: {
        song: `${song.name} - ${song.artist}`,
        feedback: feedback, // 'positive' / 'negative'
        songId: song.id
      }
    });

    // 如果是负面反馈，分析原因
    if (feedback === 'negative') {
      // TODO: 可以让 AI 分析用户为什么不喜欢这首歌
      // 例如：太慢、太快、风格不对等
    }
  }

  /**
   * 保存画像到文件
   */
  async save() {
    try {
      await fs.writeFile(
        this.profilePath,
        JSON.stringify(this.profile, null, 2),
        'utf-8'
      );
      console.log('💾 用户画像已保存');
    } catch (error) {
      console.error('❌ 保存用户画像失败:', error.message);
    }
  }

  /**
   * 获取推荐上下文（用于传递给推荐系统）
   */
  getRecommendationContext() {
    if (!this.profile) {
      return null;
    }

    return {
      // 长期偏好
      favoriteArtists: this.profile.longTerm.favoriteArtists,
      favoriteGenres: this.profile.longTerm.favoriteGenres,
      favoriteLanguages: this.profile.longTerm.favoriteLanguages,
      avoidance: [
        ...this.profile.longTerm.avoidance,
        ...this.profile.current.avoidance
      ],
      energyPreference: this.profile.longTerm.energyPreference,
      freshnessPreference: this.profile.longTerm.freshnessPreference,

      // 短期偏好
      recentMood: this.profile.shortTerm.recentMood,
      recentFeedback: this.profile.shortTerm.recentFeedback,

      // 即时状态
      currentMood: this.profile.current.mood,
      currentScene: this.profile.current.scene,
      currentWeather: this.profile.current.weather,
      currentTime: this.profile.current.time
    };
  }
}

export default UserProfile;
