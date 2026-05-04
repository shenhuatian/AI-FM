// 推荐策略模块 - 实现混合推荐（70% 探索 + 30% 舒适区）
import musicVectorStore from './music-vector-store.js';

export class RecommendationStrategy {
  constructor(ncmClient, stateManager) {
    this.ncm = ncmClient;
    this.state = stateManager;

    // 推荐比例配置
    this.EXPLORE_RATIO = 0.7;  // 70% 探索新歌
    this.COMFORT_RATIO = 0.3;  // 30% 舒适区（音乐库）
  }

  /**
   * 混合推荐：结合音乐库和网易云搜索
   * @param {string} query - 用户查询
   * @param {number} totalCount - 总共需要推荐的歌曲数量
   * @param {Object} options - 推荐选项
   * @returns {Promise<Array>} 推荐的歌曲列表
   */
  async hybridRecommend(query, totalCount = 5, options = {}) {
    const {
      artistName = '',
      mood = '',
      preferFresh = false,  // 是否偏好冷门歌曲
      excludeRecent = true  // 是否排除最近播放
    } = options;

    console.log(`\n🎯 混合推荐策略启动`);
    console.log(`   查询: ${query}`);
    console.log(`   艺术家: ${artistName || '无'}`);
    console.log(`   心情: ${mood || '无'}`);
    console.log(`   偏好冷门: ${preferFresh}`);
    console.log(`   总数: ${totalCount}`);

    // 计算探索和舒适区的数量
    const exploreCount = Math.ceil(totalCount * this.EXPLORE_RATIO);
    const comfortCount = Math.floor(totalCount * this.COMFORT_RATIO);

    console.log(`   📊 分配: ${exploreCount} 首探索 + ${comfortCount} 首舒适区`);

    // 获取最近播放的歌曲（用于去重）
    const recentSongs = excludeRecent ? this.getRecentPlayedSongs(20) : [];
    const recentSongNames = new Set(recentSongs.map(s => s.name.toLowerCase()));

    // 并行获取两种推荐
    const [exploreSongs, comfortSongs] = await Promise.all([
      this.getExploreSongs(query, artistName, mood, exploreCount, preferFresh, recentSongNames),
      this.getComfortSongs(query, artistName, mood, comfortCount, recentSongNames)
    ]);

    // 合并结果
    const allSongs = [...comfortSongs, ...exploreSongs];

    // 去重（按歌曲名）
    const uniqueSongs = this.deduplicateSongs(allSongs);

    console.log(`✅ 混合推荐完成: ${uniqueSongs.length} 首歌曲`);
    console.log(`   舒适区: ${comfortSongs.length} 首`);
    console.log(`   探索: ${exploreSongs.length} 首`);

    return uniqueSongs.slice(0, totalCount);
  }

  /**
   * 获取探索歌曲（从网易云搜索）
   */
  async getExploreSongs(query, artistName, mood, count, preferFresh, excludeNames) {
    console.log(`\n🔍 探索模式: 搜索 ${count} 首新歌`);

    const songs = [];

    // 策略1: 如果指定了艺术家，搜索该艺术家的歌曲
    if (artistName) {
      const artistSongs = await this.searchArtistSongs(artistName, count * 2, preferFresh);
      songs.push(...artistSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    // 策略2: 如果还不够，使用关键词搜索
    if (songs.length < count) {
      const keyword = artistName ? `${query} ${artistName}` : query;
      const searchResults = await this.ncm.search(keyword, count * 2);

      // 过滤热门歌曲（如果偏好冷门）
      const filtered = preferFresh
        ? this.filterByPopularity(searchResults, 'low')
        : searchResults;

      songs.push(...filtered.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    // 策略3: 如果还不够，使用相似歌曲推荐
    if (songs.length < count && songs.length > 0) {
      const similarSongs = await this.getSimilarSongsFromSeed(songs[0].id, count);
      songs.push(...similarSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    return this.deduplicateSongs(songs).slice(0, count);
  }

  /**
   * 获取舒适区歌曲（从音乐库）
   */
  async getComfortSongs(query, artistName, mood, count, excludeNames) {
    console.log(`\n🏠 舒适区模式: 从音乐库搜索 ${count} 首`);

    let songs = [];

    // 策略1: 按艺术家搜索
    if (artistName) {
      songs = musicVectorStore.searchByArtist(artistName, count * 2);
    }

    // 策略2: 按心情搜索
    if (songs.length < count && mood) {
      const moodSongs = musicVectorStore.searchByMood(mood, count * 2);
      songs.push(...moodSongs);
    }

    // 策略3: 语义搜索
    if (songs.length < count) {
      const semanticSongs = musicVectorStore.search(query, count * 2);
      songs.push(...semanticSongs);
    }

    // 过滤最近播放
    const filtered = songs.filter(s => !excludeNames.has(s.name.toLowerCase()));

    return this.deduplicateSongs(filtered).slice(0, count);
  }

  /**
   * 搜索艺术家的歌曲（支持冷门筛选）
   */
  async searchArtistSongs(artistName, limit, preferFresh) {
    console.log(`🎤 搜索艺术家: ${artistName}`);

    try {
      // 先搜索艺术家
      const artists = await this.ncm.searchArtist(artistName, 1);
      if (artists.length === 0) {
        console.log(`⚠️ 未找到艺术家: ${artistName}`);
        return [];
      }

      const artist = artists[0];
      console.log(`✅ 找到艺术家: ${artist.name} (ID: ${artist.id})`);

      // 获取艺术家的热门歌曲
      const songs = await this.ncm.getArtistTopSongs(artist.id, limit);

      // 如果偏好冷门，过滤掉太热门的
      if (preferFresh) {
        return this.filterByPopularity(songs, 'low');
      }

      return songs;
    } catch (error) {
      console.error(`❌ 搜索艺术家歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取相似歌曲（基于种子歌曲）
   */
  async getSimilarSongsFromSeed(seedSongId, limit) {
    console.log(`🔗 获取相似歌曲: seedId=${seedSongId}`);

    try {
      const similarSongs = await this.ncm.getSimilarSongs(seedSongId, limit);
      return similarSongs;
    } catch (error) {
      console.error(`❌ 获取相似歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 按热度筛选歌曲
   * @param {Array} songs - 歌曲列表
   * @param {string} level - 'high' | 'medium' | 'low'
   */
  filterByPopularity(songs, level = 'medium') {
    if (!songs || songs.length === 0) return [];

    // 如果歌曲没有 popularity 字段，直接返回
    const hasPopularity = songs.some(s => s.popularity !== undefined);
    if (!hasPopularity) {
      console.log(`⚠️ 歌曲没有热度信息，跳过筛选`);
      return songs;
    }

    // 计算热度阈值
    const popularities = songs.map(s => s.popularity || 0).filter(p => p > 0);
    if (popularities.length === 0) return songs;

    const avgPopularity = popularities.reduce((a, b) => a + b, 0) / popularities.length;

    console.log(`📊 热度统计: 平均=${avgPopularity.toFixed(0)}`);

    // 根据级别筛选
    let filtered;
    if (level === 'low') {
      // 冷门：低于平均热度
      filtered = songs.filter(s => (s.popularity || 0) < avgPopularity);
      console.log(`   筛选: 冷门歌曲 (热度 < ${avgPopularity.toFixed(0)})`);
    } else if (level === 'high') {
      // 热门：高于平均热度
      filtered = songs.filter(s => (s.popularity || 0) >= avgPopularity);
      console.log(`   筛选: 热门歌曲 (热度 >= ${avgPopularity.toFixed(0)})`);
    } else {
      // 中等：全部返回
      filtered = songs;
    }

    console.log(`   结果: ${filtered.length} / ${songs.length} 首`);

    return filtered.length > 0 ? filtered : songs;
  }

  /**
   * 去重（按歌曲名，不区分大小写）
   */
  deduplicateSongs(songs) {
    const seen = new Set();
    return songs.filter(song => {
      const key = song.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 获取最近播放的歌曲
   */
  getRecentPlayedSongs(limit = 20) {
    if (!this.state) return [];

    const plays = this.state.getPlays();
    return plays
      .slice(-limit)
      .map(p => ({ name: p.song_name || p.song || '', artist: p.artist || '' }))
      .filter(p => p.name); // 过滤掉空名称
  }

  /**
   * 智能推荐：根据用户意图自动选择策略
   * @param {string} userMessage - 用户消息
   * @param {number} count - 推荐数量
   * @returns {Promise<Array>} 推荐的歌曲列表
   */
  async smartRecommend(userMessage, count = 5) {
    console.log(`\n🧠 智能推荐: "${userMessage}"`);

    // 分析用户意图
    const intent = this.analyzeIntent(userMessage);

    console.log(`   意图分析:`, intent);

    // 根据意图调用混合推荐
    return await this.hybridRecommend(
      userMessage,
      count,
      {
        artistName: intent.artist,
        mood: intent.mood,
        preferFresh: intent.preferFresh,
        excludeRecent: true
      }
    );
  }

  /**
   * 分析用户意图
   */
  analyzeIntent(message) {
    const lowerMsg = message.toLowerCase();

    // 检测是否偏好冷门
    const preferFresh =
      lowerMsg.includes('没怎么听过') ||
      lowerMsg.includes('小众') ||
      lowerMsg.includes('冷门') ||
      lowerMsg.includes('深度') ||
      lowerMsg.includes('不要太热门') ||
      lowerMsg.includes('不要太流行');

    // 检测艺术家（改进的实现）
    let artist = '';
    const artistPatterns = [
      /(.+?)的歌/,
      /听(.+?)的/,
      /来点(.+?)的/,
      /推荐(.+?)的/
    ];

    for (const pattern of artistPatterns) {
      const match = message.match(pattern);
      if (match) {
        const candidate = match[1].trim();
        // 过滤掉常见的非艺术家词汇
        const excludeWords = ['推荐一些', '来点', '听', '我想', '给我', '播放', '放'];
        if (!excludeWords.some(word => candidate.includes(word))) {
          artist = candidate;
          break;
        }
      }
    }

    // 检测心情
    let mood = '';
    const moodKeywords = {
      '开心': ['开心', '快乐', '高兴', '愉快'],
      '悲伤': ['悲伤', '难过', '伤心', '失落'],
      '放松': ['放松', '舒缓', '安静', '平静'],
      '激动': ['激动', '兴奋', '热血', '燃'],
      '浪漫': ['浪漫', '温柔', '甜蜜', '爱情']
    };

    for (const [moodName, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(kw => lowerMsg.includes(kw))) {
        mood = moodName;
        break;
      }
    }

    return {
      artist,
      mood,
      preferFresh
    };
  }
}

export default RecommendationStrategy;
