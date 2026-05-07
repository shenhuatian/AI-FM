// 推荐策略模块 - 实现混合推荐（70% 探索 + 30% 舒适区）
import musicVectorStore from './music-vector-store.js';

export class RecommendationStrategy {
  constructor(ncmClient, stateManager, spotifyService = null) {
    this.ncm = ncmClient;
    this.state = stateManager;
    this.spotify = spotifyService;  // 🔥 Spotify 服务

    // 推荐比例配置
    this.EXPLORE_RATIO = 0.7;  // 70% 探索新歌
    this.COMFORT_RATIO = 0.3;  // 30% 舒适区（音乐库）
  }

  /**
   * 🔥 重构：混合推荐（基于意图）
   * @param {Object} intent - 意图分析结果
   * @param {number} totalCount - 总共需要推荐的歌曲数量
   * @returns {Promise<Array>} 推荐的歌曲列表
   */
  async hybridRecommend(intent, totalCount = 5) {
    console.log(`\n🎯 混合推荐策略启动`);
    console.log(`   意图:`, intent);
    console.log(`   总数: ${totalCount}`);

    // 🔥 检查音乐库是否可用
    const stats = musicVectorStore.getStats();
    const hasLibrary = stats && stats.totalSongs > 0;

    // 🔥 根据意图动态计算比例
    const ratio = this.calculateDynamicRatio(intent, hasLibrary);
    console.log(`   📊 动态比例: ${(ratio.explore * 100).toFixed(0)}% 探索 + ${(ratio.comfort * 100).toFixed(0)}% 舒适区`);

    // 计算探索和舒适区的数量
    const exploreCount = Math.ceil(totalCount * ratio.explore);
    const comfortCount = Math.floor(totalCount * ratio.comfort);

    console.log(`   📊 分配: ${exploreCount} 首探索 + ${comfortCount} 首舒适区`);
    if (!hasLibrary) {
      console.log(`   ⚠️ 音乐库为空，使用 100% 探索模式`);
    }

    // 获取最近播放的歌曲（用于去重）
    const recentSongs = this.getRecentPlayedSongs(500);
    const recentSongNames = new Set(recentSongs.map(s => s.name.toLowerCase()));

    // 并行获取两种推荐
    const [exploreSongs, comfortSongs] = await Promise.all([
      this.getExploreSongs(intent, exploreCount, recentSongNames),
      this.getComfortSongs(intent, comfortCount, recentSongNames)
    ]);

    // 🔥 确保返回的是数组
    const safeExploreSongs = Array.isArray(exploreSongs) ? exploreSongs : [];
    const safeComfortSongs = Array.isArray(comfortSongs) ? comfortSongs : [];

    // 合并结果（舒适区在前，探索在后）
    const allSongs = [...safeComfortSongs, ...safeExploreSongs];

    // 去重（按歌曲名）
    const uniqueSongs = this.deduplicateSongs(allSongs);

    console.log(`✅ 混合推荐完成: ${uniqueSongs.length} 首歌曲`);
    console.log(`   舒适区: ${safeComfortSongs.length} 首`);
    console.log(`   探索: ${safeExploreSongs.length} 首`);

    return uniqueSongs.slice(0, totalCount);
  }

  /**
   * 🔥 新增：根据意图动态计算探索/舒适区比例
   * @param {Object} intent - 意图分析结果
   * @param {boolean} hasLibrary - 是否有音乐库
   * @returns {Object} { explore, comfort }
   */
  calculateDynamicRatio(intent, hasLibrary) {
    // 如果没有音乐库，100% 探索
    if (!hasLibrary) {
      return { explore: 1.0, comfort: 0.0 };
    }

    // 情况1：偏好新鲜（"没听过的"）
    if (intent.freshness === 'fresh') {
      return { explore: 0.9, comfort: 0.1 };
    }

    // 情况2：偏好熟悉
    if (intent.freshness === 'familiar') {
      return { explore: 0.3, comfort: 0.7 };
    }

    // 情况3：指定艺术家
    if (intent.artist) {
      return { explore: 0.5, comfort: 0.5 };
    }

    // 默认：70% 探索 + 30% 舒适区
    return { explore: 0.7, comfort: 0.3 };
  }

  /**
   * 🔥 重构：获取探索歌曲（使用网易云推荐 API）
   * @param {Object} intent - 意图分析结果
   * @param {number} count - 需要的歌曲数量
   * @param {Set} excludeNames - 排除的歌曲名称
   * @returns {Promise<Array>} 探索歌曲列表
   */
  async getExploreSongs(intent, count, excludeNames) {
    console.log(`\n🔍 探索模式: 搜索 ${count} 首新歌`);
    console.log(`   意图:`, intent);

    const songs = [];

    // 🔥 策略1: 如果指定了艺术家，优先推荐该艺术家（100%）
    if (intent.artist) {
      console.log(`🎤 策略1: 艺术家推荐（优先级最高）`);

      // 如果偏好冷门/小众，使用专辑分散推荐
      if (intent.freshness === 'fresh') {
        console.log(`   使用专辑分散推荐（冷门歌曲）`);
        const deepCuts = await this.getDeepCutsFromAlbums(intent.artist, count * 3);
        songs.push(...deepCuts.filter(s => !excludeNames.has(s.name.toLowerCase())));
      } else {
        const artistSongs = await this.searchArtistSongs(intent.artist, count * 3, false);
        songs.push(...artistSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
      }

      // 如果艺术家推荐已经足够，直接返回
      if (songs.length >= count) {
        const uniqueSongs = this.deduplicateSongs(songs);
        console.log(`✅ 探索模式完成（艺术家推荐）: ${uniqueSongs.length} 首`);
        return uniqueSongs.slice(0, count);
      }
    }

    // 🔥 策略2: 精品歌单推荐（增加搜索数量）
    if (songs.length < count) {
      const needed = count - songs.length;
      console.log(`📀 策略2: 精品歌单推荐 (需要 ${needed} 首)`);

      const playlistSongs = await this.getFromHighQualityPlaylists(intent, needed * 3);
      songs.push(...playlistSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    // 🔥 策略3: 关键词搜索（提高优先级）
    if (songs.length < count && intent.keywords.length > 0) {
      const needed = count - songs.length;
      console.log(`🔍 策略3: 关键词搜索 (需要 ${needed} 首)`);
      const keyword = intent.keywords.join(' ');
      console.log(`   关键词: ${keyword}`);
      const searchResults = await this.ncm.search(keyword, needed * 3);
      songs.push(...searchResults.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    // 🔥 策略4: 私人 FM 推荐（多次调用）
    if (songs.length < count) {
      const needed = count - songs.length;
      console.log(`📻 策略4: 私人 FM 推荐 (需要 ${needed} 首)`);

      // 多次调用私人FM以获取更多歌曲
      for (let i = 0; i < 3 && songs.length < count; i++) {
        const fmSongs = await this.getFromPersonalFM(intent, needed * 2);
        songs.push(...fmSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
      }
    }

    // 🔥 策略5: 推荐新歌
    if (songs.length < count) {
      const needed = count - songs.length;
      console.log(`🆕 策略5: 推荐新歌 (需要 ${needed} 首)`);

      const newSongs = await this.getFromRecommendNewSongs(intent, needed * 2);
      songs.push(...newSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    // 🔥 策略6: 如果还不够，使用相似歌曲推荐
    if (songs.length < count && songs.length > 0) {
      const needed = count - songs.length;
      console.log(`🔗 策略6: 相似歌曲推荐 (需要 ${needed} 首)`);
      const similarSongs = await this.getSimilarSongsFromSeed(songs[0].id, needed * 2);
      songs.push(...similarSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    // 🔥 策略7: 最后的备用方案 - 搜索流行歌曲
    if (songs.length < count) {
      const needed = count - songs.length;
      console.log(`🎵 策略7: 备用方案 - 搜索流行歌曲 (需要 ${needed} 首)`);
      const fallbackSongs = await this.ncm.search('流行 华语', needed * 2);
      songs.push(...fallbackSongs.filter(s => !excludeNames.has(s.name.toLowerCase())));
    }

    const uniqueSongs = this.deduplicateSongs(songs);
    console.log(`✅ 探索模式完成: ${uniqueSongs.length} 首`);

    return uniqueSongs.slice(0, count);
  }

  /**
   * 🔥 新增：从精品歌单获取歌曲
   * @param {Object} intent - 意图分析结果
   * @param {number} count - 需要的歌曲数量
   * @returns {Promise<Array>} 歌曲列表
   */
  async getFromHighQualityPlaylists(intent, count) {
    try {
      // 根据意图映射到歌单分类
      const category = this.mapIntentToCategory(intent);
      console.log(`   分类: ${category}`);

      // 获取精品歌单
      const playlists = await this.ncm.getHighQualityPlaylists(category, 5);
      if (playlists.length === 0) {
        return [];
      }

      // 随机选择 2-3 个歌单
      const selectedPlaylists = this.randomPick(playlists, Math.min(3, playlists.length));
      console.log(`   选中歌单: ${selectedPlaylists.map(p => p.name).join(', ')}`);

      // 从每个歌单中随机选择歌曲
      const songs = [];
      for (const playlist of selectedPlaylists) {
        const tracks = await this.ncm.getPlaylistTracks(playlist.id, 20);
        const picked = this.randomPick(tracks, Math.ceil(count / selectedPlaylists.length));
        songs.push(...picked);
      }

      return songs;
    } catch (error) {
      console.error(`❌ 从精品歌单获取歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：从私人 FM 获取歌曲
   * @param {Object} intent - 意图分析结果
   * @param {number} count - 需要的歌曲数量
   * @returns {Promise<Array>} 歌曲列表
   */
  async getFromPersonalFM(intent, count) {
    try {
      const fmSongs = await this.ncm.getPersonalFM();
      if (fmSongs.length === 0) {
        return [];
      }

      // 根据意图过滤（如果有心情或风格要求）
      let filtered = fmSongs;
      if (intent.mood || intent.style.length > 0) {
        // 简单过滤：检查歌曲名或艺术家是否包含关键词
        const keywords = [intent.mood, ...intent.style, ...intent.keywords].filter(Boolean);
        filtered = fmSongs.filter(song => {
          const text = `${song.name} ${song.artist}`.toLowerCase();
          return keywords.some(kw => text.includes(kw.toLowerCase()));
        });

        // 如果过滤后没有歌曲，返回原始列表
        if (filtered.length === 0) {
          filtered = fmSongs;
        }
      }

      return filtered.slice(0, count);
    } catch (error) {
      console.error(`❌ 从私人 FM 获取歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：从推荐新歌获取歌曲
   * @param {Object} intent - 意图分析结果
   * @param {number} count - 需要的歌曲数量
   * @returns {Promise<Array>} 歌曲列表
   */
  async getFromRecommendNewSongs(intent, count) {
    try {
      const newSongs = await this.ncm.getRecommendNewSongs(count);
      return newSongs;
    } catch (error) {
      console.error(`❌ 从推荐新歌获取歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 重新设计：智能分类映射（支持多样性和探索）
   * @param {Object} intent - 意图分析结果
   * @returns {string|Array} 歌单分类（可以返回数组表示多个分类）
   */
  mapIntentToCategory(intent) {
    // 🔥 如果用户明确指定了风格，严格遵守
    if (intent.style && intent.style.length > 0) {
      const style = intent.style[0];
      const styleMap = {
        '流行': '流行',
        '摇滚': '摇滚',
        '民谣': '民谣',
        '电子': '电子',
        '爵士': '爵士',
        '古典': '古典',
        '说唱': '说唱',
        'Hip-Hop': '说唱',
        'Funk': '电子',
        '蓝调': '爵士',
        '轻音乐': '轻音乐',
        '华语': '华语',
        '欧美': '欧美',
        '粤语': '华语',
        '日语': '日语',
        '韩语': '韩语',
        '轻快': '流行'
      };
      if (styleMap[style]) {
        return styleMap[style];
      }
    }

    // 🔥 如果有心情，返回多个可能的分类，增加多样性
    if (intent.mood) {
      const moodMap = {
        '欢快': ['流行', '电子', '说唱'],      // 🔥 多个选择
        '开心': ['流行', '爵士', '电子'],
        '快乐': ['流行', '说唱'],
        '悲伤': ['民谣', '流行', '爵士'],      // 🔥 蓝调爵士也很适合悲伤
        '伤心': ['民谣', '流行'],
        '放松': ['轻音乐', '爵士', '民谣'],    // 🔥 爵士很放松
        '舒缓': ['轻音乐', '爵士'],
        '激动': ['摇滚', '电子', '说唱'],
        '兴奋': ['电子', '说唱', '摇滚'],
        '浪漫': ['流行', '爵士', '轻音乐']
      };
      if (moodMap[intent.mood]) {
        // 🔥 随机选择一个分类，增加惊喜感
        const categories = moodMap[intent.mood];
        return categories[Math.floor(Math.random() * categories.length)];
      }
    }

    // 🔥 根据能量和节奏映射到多样化的分类
    if (intent.energy === 'high' || intent.tempo === 'fast') {
      const highEnergyCategories = ['流行', '电子', '摇滚', '说唱'];
      return highEnergyCategories[Math.floor(Math.random() * highEnergyCategories.length)];
    }

    if (intent.energy === 'low' || intent.tempo === 'slow') {
      const lowEnergyCategories = ['民谣', '爵士', '轻音乐'];
      return lowEnergyCategories[Math.floor(Math.random() * lowEnergyCategories.length)];
    }

    // 🔥 默认：随机返回一个分类，真正的探索！
    const allCategories = ['流行', '摇滚', '民谣', '电子', '爵士', '说唱', '轻音乐'];
    return allCategories[Math.floor(Math.random() * allCategories.length)];
  }

  /**
   * 🔥 重构：获取舒适区歌曲（从音乐库）
   * @param {Object} intent - 意图分析结果
   * @param {number} count - 需要的歌曲数量
   * @param {Set} excludeNames - 排除的歌曲名称
   * @returns {Promise<Array>} 舒适区歌曲列表
   */
  async getComfortSongs(intent, count, excludeNames) {
    console.log(`\n🏠 舒适区模式: 从音乐库搜索 ${count} 首`);

    // 检查音乐库是否可用
    const stats = musicVectorStore.getStats();
    if (!stats || stats.totalSongs === 0) {
      console.log(`⚠️ 音乐库为空，跳过舒适区推荐`);
      return [];
    }

    let songs = [];

    // 策略1: 按艺术家搜索
    if (intent.artist) {
      console.log(`   策略1: 艺术家搜索 - ${intent.artist}`);
      const artistSongs = musicVectorStore.searchByArtist(intent.artist, count * 2);
      if (Array.isArray(artistSongs)) {
        songs = artistSongs;
      }
    }

    // 策略2: 按心情搜索
    if (songs.length < count && intent.mood) {
      console.log(`   策略2: 心情搜索 - ${intent.mood}`);
      const moodSongs = await musicVectorStore.searchByMood(intent.mood, count * 2);
      if (Array.isArray(moodSongs)) {
        songs.push(...moodSongs);
      }
    }

    // 策略3: 语义搜索（使用关键词）
    if (songs.length < count && intent.keywords.length > 0) {
      console.log(`   策略3: 语义搜索 - ${intent.keywords.join(', ')}`);
      const query = intent.keywords.join(' ');
      const semanticSongs = await musicVectorStore.semanticSearch(query, count * 2);
      if (Array.isArray(semanticSongs)) {
        songs.push(...semanticSongs);
      }
    }

    // 过滤最近播放
    const filtered = songs.filter(s => !excludeNames.has(s.name.toLowerCase()));

    const uniqueSongs = this.deduplicateSongs(filtered);
    console.log(`✅ 舒适区模式完成: ${uniqueSongs.length} 首`);

    return uniqueSongs.slice(0, count);
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
   * 🔥 新增：从艺术家的专辑中获取分散的冷门歌曲
   * @param {string} artistName - 艺术家名称
   * @param {number} count - 需要的歌曲数量
   * @returns {Promise<Array>} 冷门歌曲列表
   */
  async getDeepCutsFromAlbums(artistName, count = 5) {
    console.log(`\n🎵 专辑分散推荐: ${artistName}`);

    try {
      // 1. 搜索艺术家
      const artists = await this.ncm.searchArtist(artistName, 1);
      if (artists.length === 0) {
        console.log(`⚠️ 未找到艺术家: ${artistName}`);
        return [];
      }

      const artist = artists[0];
      console.log(`✅ 找到艺术家: ${artist.name} (ID: ${artist.id})`);

      // 2. 获取艺术家的所有专辑
      const albums = await this.ncm.getArtistAlbums(artist.id, 50);
      if (albums.length === 0) {
        console.log(`⚠️ 该艺术家没有专辑`);
        return [];
      }

      console.log(`📀 找到 ${albums.length} 张专辑`);

      // 3. 获取艺术家的热门歌曲（用于排除）
      const topSongs = await this.ncm.getArtistTopSongs(artist.id, 10);
      const topSongNames = new Set(topSongs.map(s => s.name.toLowerCase()));
      console.log(`🔥 排除前 ${topSongs.length} 首热门歌曲`);

      // 4. 从每张专辑随机选择 1-2 首非热门歌曲
      const deepCuts = [];
      const albumsToSample = Math.min(albums.length, count * 2); // 最多采样 count*2 张专辑

      for (let i = 0; i < albumsToSample; i++) {
        const album = albums[i];

        try {
          // 获取专辑的所有歌曲
          const albumSongs = await this.ncm.getAlbumSongs(album.id);

          if (albumSongs.length === 0) continue;

          // 过滤掉热门歌曲和前3首（通常是主打歌）
          const nonTopSongs = albumSongs
            .slice(3) // 跳过前3首
            .filter(s => !topSongNames.has(s.name.toLowerCase()));

          if (nonTopSongs.length === 0) {
            // 如果过滤后没有歌了，就从所有歌曲中选（排除热门）
            const fallbackSongs = albumSongs.filter(s => !topSongNames.has(s.name.toLowerCase()));
            if (fallbackSongs.length > 0) {
              const selected = this.randomPick(fallbackSongs, 1);
              deepCuts.push(...selected);
            }
          } else {
            // 随机选 1-2 首
            const pickCount = Math.min(2, nonTopSongs.length);
            const selected = this.randomPick(nonTopSongs, pickCount);
            deepCuts.push(...selected);
          }
        } catch (error) {
          console.log(`⚠️ 获取专辑 ${album.name} 的歌曲失败:`, error.message);
          continue;
        }
      }

      console.log(`✅ 从 ${albumsToSample} 张专辑中选出 ${deepCuts.length} 首冷门歌曲`);

      // 5. 随机打乱并返回指定数量
      return this.shuffle(deepCuts).slice(0, count);
    } catch (error) {
      console.error(`❌ 专辑分散推荐失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：随机选择数组中的元素
   */
  randomPick(array, count) {
    if (!array || array.length === 0) return [];
    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * 🔥 新增：打乱数组
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
   * 获取最近播放的歌曲（简化版，只使用当前会话）
   */
  getRecentPlayedSongs(limit = 500) {
    if (!this.state) return [];

    // 只读取当前会话的播放记录
    const sessionPlays = this.state.getPlays();

    console.log(`🔥 总播放历史: ${sessionPlays.length} 首 (当前会话)`);

    return sessionPlays
      .map(p => ({
        name: p.song_name || p.song || '',
        artist: p.artist || ''
      }))
      .filter(p => p.name)
      .slice(-limit);
  }

  /**
   * 智能推荐：根据用户意图自动选择策略
   * @param {string} userMessage - 用户消息
   * @param {number} count - 推荐数量
   * @param {string} hintArtist - 从AI推荐中提取的艺术家提示（可选）
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Array>} 推荐的歌曲列表
   */
  async smartRecommend(userMessage, count = 5, hintArtist = '', conversationHistory = []) {
    console.log(`\n🧠 智能推荐: "${userMessage}"`);
    if (hintArtist) {
      console.log(`   🎤 艺术家提示: ${hintArtist}`);
    }

    // 🔥 分析用户意图（传入对话历史）
    const intent = this.analyzeIntent(userMessage, conversationHistory);

    // 🔥 如果没有从消息中识别到艺术家，使用提示的艺术家
    if (!intent.artist && hintArtist) {
      intent.artist = hintArtist;
      console.log(`   ✅ 使用提示的艺术家: ${hintArtist}`);
    }

    console.log(`   意图分析:`, intent);

    // 🔥 计算动态比例
    const dynamicRatio = this.getDynamicRatio(intent);

    // 根据意图调用混合推荐
    const songs = await this.hybridRecommend(
      userMessage,
      count,
      {
        artistName: intent.artist,
        mood: intent.mood,
        preferFresh: intent.preferFresh,
        preferCold: intent.preferCold,
        excludeRecent: true,
        dynamicRatio: dynamicRatio,
        conversationHistory: conversationHistory
      }
    );

    // 🔥 新增：使用 Spotify 增强推荐
    if (this.spotify && songs.length > 0) {
      return await this.enhanceWithSpotify(songs, intent);
    }

    return songs;
  }

  /**
   * 🔥 新增：使用 Spotify 音频特征增强推荐
   * @param {Array} songs - 候选歌曲列表
   * @param {Object} intent - 用户意图
   * @returns {Promise<Array>} 增强后的歌曲列表
   */
  async enhanceWithSpotify(songs, intent) {
    console.log(`\n🎵 使用 Spotify 增强推荐...`);

    try {
      // 为每首歌获取 Spotify 音频特征
      const songsWithFeatures = [];

      for (const song of songs) {
        try {
          const spotifyData = await this.spotify.getAudioFeaturesBySong(song.name, song.artist);
          if (spotifyData && spotifyData.audioFeatures) {
            songsWithFeatures.push({
              ...song,
              spotifyFeatures: spotifyData.audioFeatures
            });
          } else {
            // 如果找不到 Spotify 数据，保留原歌曲
            songsWithFeatures.push(song);
          }
        } catch (error) {
          console.log(`⚠️ 获取 ${song.name} 的 Spotify 特征失败`);
          songsWithFeatures.push(song);
        }

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ 获取到 ${songsWithFeatures.filter(s => s.spotifyFeatures).length} 首歌曲的音频特征`);

      // 根据意图筛选
      let filtered = songsWithFeatures;

      // 根据情绪筛选
      if (intent.mood) {
        const moodMap = {
          '开心': 'happy',
          '悲伤': 'sad',
          '放松': 'calm',
          '激动': 'energetic'
        };

        const spotifyMood = moodMap[intent.mood];
        if (spotifyMood) {
          console.log(`🎭 根据情绪筛选: ${intent.mood} -> ${spotifyMood}`);
          const moodFiltered = this.spotify.filterByMood(songsWithFeatures, spotifyMood);
          if (moodFiltered.length > 0) {
            filtered = moodFiltered;
          }
        }
      }

      // 根据场景筛选（如果消息中包含场景关键词）
      const sceneKeywords = {
        work: ['工作', '学习', '专注'],
        workout: ['运动', '健身', '跑步'],
        sleep: ['睡觉', '睡眠', '入睡'],
        party: ['派对', '聚会', '嗨']
      };

      for (const [scene, keywords] of Object.entries(sceneKeywords)) {
        if (keywords.some(kw => intent.originalMessage?.includes(kw))) {
          console.log(`🎬 根据场景筛选: ${scene}`);
          const sceneFiltered = this.spotify.filterByScene(songsWithFeatures, scene);
          if (sceneFiltered.length > 0) {
            filtered = sceneFiltered;
          }
          break;
        }
      }

      return filtered;
    } catch (error) {
      console.error(`❌ Spotify 增强失败:`, error.message);
      return songs;
    }
  }

  /**
   * 🔥 新增：从对话历史中提取艺术家上下文
   */
  extractArtistFromHistory(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return null;
    }

    // 检查最近 3 条对话
    const recentMessages = conversationHistory.slice(-3);

    for (const msg of recentMessages.reverse()) {
      const content = msg.content || msg.message || '';
      const lowerContent = content.toLowerCase();

      // 检测艺术家提及
      const artistPatterns = [
        /(.+?)的歌/,
        /听(.+?)的/,
        /来点(.+?)的/,
        /推荐(.+?)的/,
        /播放(.+?)的/
      ];

      for (const pattern of artistPatterns) {
        const match = content.match(pattern);
        if (match) {
          const candidate = match[1].trim();
          // 过滤掉常见的非艺术家词汇
          const excludeWords = [
            '推荐一些', '来点', '听', '我想', '给我', '播放', '放', '这些', '那些', '好的', '为你', '推荐',
            '一些', '浪漫', '开心', '悲伤', '放松', '激动', '舒缓', '温柔', '温暖', '治愈',
            '快乐', '伤感', '安静', '热血', '甜蜜', '怀旧', '经典', '流行',
            '民谣', '摇滚', '爵士', '古典', '电子', '说唱', '轻音乐'
          ];
          const hasExcludeWord = excludeWords.some(word => candidate.includes(word));

          // 🔥 修复：检查候选词是否合理（长度在2-10个字符之间，且不包含排除词）
          if (!hasExcludeWord && candidate.length >= 2 && candidate.length <= 10) {
            console.log(`🎯 从对话历史中提取到艺术家: ${candidate}`);
            return candidate;
          }
        }
      }
    }

    return null;
  }

  /**
   * 🔥 改进：分析用户意图（支持上下文感知）
   */
  analyzeIntent(message, conversationHistory = []) {
    const lowerMsg = message.toLowerCase();

    // 检测是否偏好冷门/新鲜
    const preferFresh =
      lowerMsg.includes('没听过') ||
      lowerMsg.includes('没怎么听过') ||
      lowerMsg.includes('小众') ||
      lowerMsg.includes('冷门') ||
      lowerMsg.includes('深度') ||
      lowerMsg.includes('不要太热门') ||
      lowerMsg.includes('不要太流行') ||
      lowerMsg.includes('新鲜') ||
      lowerMsg.includes('不一样');

    // 检测是否偏好小众（更激进的探索）
    const preferCold =
      lowerMsg.includes('小众') ||
      lowerMsg.includes('冷门') ||
      lowerMsg.includes('深度');

    // 检测艺术家（从当前消息）
    let artist = '';
    const artistPatterns = [
      /(.+?)的歌/,
      /听(.+?)的/,
      /来点(.+?)的/,
      /推荐(.+?)的/,
      /播放(.+?)的/
    ];

    for (const pattern of artistPatterns) {
      const match = message.match(pattern);
      if (match) {
        const candidate = match[1].trim();
        // 🔥 修复：过滤掉常见的非艺术家词汇，并检查长度
        const excludeWords = [
          '推荐一些', '来点', '听', '我想', '给我', '播放', '放', '这些', '那些',
          '分享一些', '没听过', '小众', '冷门', '没怎么听',
          // 🔥 新增：心情和风格词汇
          '一些', '浪漫', '开心', '悲伤', '放松', '激动', '舒缓', '温柔',
          '快乐', '伤感', '安静', '热血', '甜蜜', '怀旧', '经典', '流行',
          '民谣', '摇滚', '爵士', '古典', '电子', '说唱', '轻音乐'
        ];
        const hasExcludeWord = excludeWords.some(word => candidate.includes(word));

        // 🔥 额外检查：如果候选词只有1个字，很可能是误匹配（如"过"、"那"）
        const isSingleChar = candidate.length === 1;

        // 检查候选词是否合理（长度在2-10个字符之间，且不包含排除词）
        if (!hasExcludeWord && !isSingleChar && candidate.length >= 2 && candidate.length <= 10) {
          artist = candidate;
          break;
        }
      }
    }

    // 🔥 如果当前消息没有艺术家，从对话历史中提取
    const contextArtist = !artist ? this.extractArtistFromHistory(conversationHistory) : null;

    // 🔥 判断是上下文相关还是完全随机
    const type = (preferFresh || preferCold) && !artist && contextArtist
      ? 'contextual'  // 上下文相关（如："给我分享一些我没听过的那"，上文提到了陶喆）
      : (preferFresh || preferCold) && !artist && !contextArtist
      ? 'random'      // 完全随机（如："推荐一些没听过的歌"）
      : 'normal';     // 普通推荐

    // 检测心情
    let mood = '';
    const moodKeywords = {
      '开心': ['开心', '快乐', '高兴', '愉快'],
      '悲伤': ['悲伤', '难过', '伤心', '失落'],
      '放松': ['放松', '舒缓', '安静', '平静', '治愈', '温暖', '温柔'],
      '激动': ['激动', '兴奋', '热血', '燃'],
      '浪漫': ['浪漫', '甜蜜', '爱情']
    };

    for (const [moodName, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(kw => lowerMsg.includes(kw))) {
        mood = moodName;
        break;
      }
    }

    return {
      type,                              // 'contextual' | 'random' | 'normal'
      artist: artist || contextArtist,   // 优先使用当前消息的艺术家，否则使用上下文艺术家
      mood,
      preferFresh,                       // 是否偏好新鲜
      preferCold,                        // 是否偏好小众
      originalMessage: message           // 🔥 新增：保存原始消息用于场景检测
    };
  }

  /**
   * 🔥 新增：根据意图动态计算探索/舒适区比例
   */
  getDynamicRatio(intent) {
    // 情况1：完全随机探索（"推荐一些没听过的歌"）
    if (intent.preferFresh && intent.type === 'random') {
      console.log(`🎯 动态比例: 100% 探索（完全随机）`);
      return { explore: 1.0, comfort: 0.0 };
    }

    // 情况2：上下文相关的新鲜推荐（"陶喆没听过的歌"）
    if (intent.preferFresh && intent.type === 'contextual') {
      console.log(`🎯 动态比例: 80% 探索 + 20% 舒适区（上下文相关）`);
      return { explore: 0.8, comfort: 0.2 };
    }

    // 情况3：小众推荐
    if (intent.preferCold) {
      console.log(`🎯 动态比例: 90% 探索 + 10% 舒适区（小众）`);
      return { explore: 0.9, comfort: 0.1 };
    }

    // 情况4：指定艺术家但不要求新鲜（"我想听陶喆的歌"）
    if (intent.artist && !intent.preferFresh) {
      console.log(`🎯 动态比例: 30% 探索 + 70% 舒适区（熟悉艺术家）`);
      return { explore: 0.3, comfort: 0.7 };
    }

    // 默认：平衡
    console.log(`🎯 动态比例: 50% 探索 + 50% 舒适区（平衡）`);
    return { explore: 0.5, comfort: 0.5 };
  }
}

export default RecommendationStrategy;
