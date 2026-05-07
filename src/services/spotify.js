// Spotify API 服务 - 获取音频特征
import SpotifyWebApi from 'spotify-web-api-node';

export class SpotifyService {
  constructor(clientId, clientSecret) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: clientId,
      clientSecret: clientSecret
    });
    this.tokenExpirationTime = 0;
  }

  /**
   * 获取访问令牌
   */
  async getAccessToken() {
    try {
      // 如果令牌还没过期，直接返回
      if (Date.now() < this.tokenExpirationTime) {
        return;
      }

      console.log('🎵 获取 Spotify 访问令牌...');
      const data = await this.spotifyApi.clientCredentialsGrant();

      this.spotifyApi.setAccessToken(data.body['access_token']);
      // 设置过期时间（提前5分钟刷新）
      this.tokenExpirationTime = Date.now() + (data.body['expires_in'] - 300) * 1000;

      console.log('✅ Spotify 访问令牌获取成功');
    } catch (error) {
      console.error('❌ 获取 Spotify 访问令牌失败:', error.message);
      throw error;
    }
  }

  /**
   * 搜索歌曲
   * @param {string} songName - 歌曲名
   * @param {string} artistName - 艺术家名
   * @returns {Promise<Object|null>} Spotify 歌曲信息
   */
  async searchTrack(songName, artistName = '') {
    try {
      await this.getAccessToken();

      const query = artistName ? `track:${songName} artist:${artistName}` : songName;
      console.log(`🔍 Spotify 搜索: ${query}`);

      const result = await this.spotifyApi.searchTracks(query, { limit: 5 });

      if (!result.body.tracks || !result.body.tracks.items || result.body.tracks.items.length === 0) {
        console.log(`⚠️ Spotify 未找到: ${songName} - ${artistName}`);
        return null;
      }

      // 返回第一个匹配结果
      const track = result.body.tracks.items[0];
      console.log(`✅ Spotify 找到: ${track.name} - ${track.artists[0].name} (ID: ${track.id})`);

      return {
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        uri: track.uri
      };
    } catch (error) {
      console.error(`❌ Spotify 搜索失败:`, error);
      return null;
    }
  }

  /**
   * 获取歌曲的音频特征
   * @param {string} trackId - Spotify 歌曲 ID
   * @returns {Promise<Object|null>} 音频特征
   */
  async getAudioFeatures(trackId) {
    try {
      await this.getAccessToken();

      console.log(`🎵 获取音频特征: ${trackId}`);
      const result = await this.spotifyApi.getAudioFeaturesForTrack(trackId);

      if (!result.body) {
        console.log(`⚠️ 未找到音频特征`);
        return null;
      }

      const features = result.body;
      console.log(`✅ 音频特征获取成功:`);
      console.log(`   - 可舞性: ${features.danceability.toFixed(2)}`);
      console.log(`   - 能量: ${features.energy.toFixed(2)}`);
      console.log(`   - 情绪: ${features.valence.toFixed(2)} (${features.valence > 0.5 ? '积极' : '消极'})`);
      console.log(`   - 节奏: ${features.tempo.toFixed(0)} BPM`);

      return {
        // 核心特征
        danceability: features.danceability,      // 可舞性 (0-1)
        energy: features.energy,                  // 能量 (0-1)
        valence: features.valence,                // 情绪正负 (0-1，越高越积极)
        tempo: features.tempo,                    // 节奏 (BPM)

        // 音乐属性
        acousticness: features.acousticness,      // 声学性 (0-1)
        instrumentalness: features.instrumentalness, // 器乐性 (0-1)
        liveness: features.liveness,              // 现场感 (0-1)
        speechiness: features.speechiness,        // 语音性 (0-1)

        // 音乐理论
        key: features.key,                        // 调性 (0-11)
        mode: features.mode,                      // 大调/小调 (0/1)
        loudness: features.loudness,              // 响度 (dB)

        // 时间信息
        duration_ms: features.duration_ms,        // 时长 (毫秒)
        time_signature: features.time_signature   // 拍号
      };
    } catch (error) {
      console.error(`❌ 获取音频特征失败:`, error.message);
      return null;
    }
  }

  /**
   * 通过歌曲名和艺术家名获取音频特征
   * @param {string} songName - 歌曲名
   * @param {string} artistName - 艺术家名
   * @returns {Promise<Object|null>} 音频特征
   */
  async getAudioFeaturesBySong(songName, artistName = '') {
    try {
      // 1. 搜索歌曲
      const track = await this.searchTrack(songName, artistName);
      if (!track) {
        return null;
      }

      // 2. 获取音频特征
      const features = await this.getAudioFeatures(track.id);
      if (!features) {
        return null;
      }

      // 3. 合并歌曲信息和音频特征
      return {
        ...track,
        audioFeatures: features
      };
    } catch (error) {
      console.error(`❌ 获取歌曲音频特征失败:`, error.message);
      return null;
    }
  }

  /**
   * 批量获取音频特征
   * @param {Array} songs - 歌曲列表 [{name, artist}]
   * @returns {Promise<Array>} 音频特征列表
   */
  async getBatchAudioFeatures(songs) {
    const results = [];

    for (const song of songs) {
      const features = await this.getAudioFeaturesBySong(song.name, song.artist);
      if (features) {
        results.push({
          ...song,
          spotifyFeatures: features
        });
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * 计算两首歌的相似度（基于音频特征）
   * @param {Object} features1 - 歌曲1的音频特征
   * @param {Object} features2 - 歌曲2的音频特征
   * @returns {number} 相似度 (0-1)
   */
  calculateSimilarity(features1, features2) {
    if (!features1 || !features2) {
      return 0;
    }

    // 权重配置（根据重要性调整）
    const weights = {
      danceability: 0.15,
      energy: 0.20,
      valence: 0.25,      // 情绪最重要
      acousticness: 0.10,
      instrumentalness: 0.10,
      speechiness: 0.05,
      tempo: 0.15         // 节奏也很重要
    };

    let similarity = 0;

    // 计算各个特征的相似度
    for (const [key, weight] of Object.entries(weights)) {
      if (key === 'tempo') {
        // 节奏使用相对差异（归一化到0-1）
        const tempoDiff = Math.abs(features1.tempo - features2.tempo);
        const maxTempoDiff = 100; // 假设最大差异为100 BPM
        const tempoSimilarity = 1 - Math.min(tempoDiff / maxTempoDiff, 1);
        similarity += tempoSimilarity * weight;
      } else {
        // 其他特征直接计算差异
        const diff = Math.abs(features1[key] - features2[key]);
        similarity += (1 - diff) * weight;
      }
    }

    return similarity;
  }

  /**
   * 根据音频特征推荐相似歌曲
   * @param {Object} targetFeatures - 目标歌曲的音频特征
   * @param {Array} candidateSongs - 候选歌曲列表（需要包含 spotifyFeatures）
   * @param {number} limit - 返回数量
   * @returns {Array} 推荐歌曲列表（按相似度排序）
   */
  recommendSimilar(targetFeatures, candidateSongs, limit = 5) {
    const scored = candidateSongs
      .filter(song => song.spotifyFeatures && song.spotifyFeatures.audioFeatures)
      .map(song => ({
        ...song,
        similarity: this.calculateSimilarity(
          targetFeatures,
          song.spotifyFeatures.audioFeatures
        )
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  }

  /**
   * 根据情绪筛选歌曲
   * @param {Array} songs - 歌曲列表（需要包含 spotifyFeatures）
   * @param {string} mood - 情绪类型 ('happy', 'sad', 'energetic', 'calm')
   * @returns {Array} 筛选后的歌曲
   */
  filterByMood(songs, mood) {
    const moodRanges = {
      happy: { valence: [0.6, 1.0], energy: [0.5, 1.0] },
      sad: { valence: [0.0, 0.4], energy: [0.0, 0.5] },
      energetic: { valence: [0.5, 1.0], energy: [0.7, 1.0] },
      calm: { valence: [0.3, 0.7], energy: [0.0, 0.4] }
    };

    const range = moodRanges[mood];
    if (!range) {
      return songs;
    }

    return songs.filter(song => {
      if (!song.spotifyFeatures || !song.spotifyFeatures.audioFeatures) {
        return false;
      }

      const features = song.spotifyFeatures.audioFeatures;
      return (
        features.valence >= range.valence[0] &&
        features.valence <= range.valence[1] &&
        features.energy >= range.energy[0] &&
        features.energy <= range.energy[1]
      );
    });
  }

  /**
   * 根据场景筛选歌曲
   * @param {Array} songs - 歌曲列表（需要包含 spotifyFeatures）
   * @param {string} scene - 场景类型 ('work', 'workout', 'sleep', 'party')
   * @returns {Array} 筛选后的歌曲
   */
  filterByScene(songs, scene) {
    const sceneRanges = {
      work: {
        energy: [0.3, 0.6],
        speechiness: [0.0, 0.3],  // 少语音
        instrumentalness: [0.3, 1.0]  // 偏器乐
      },
      workout: {
        energy: [0.7, 1.0],
        tempo: [120, 180],
        danceability: [0.6, 1.0]
      },
      sleep: {
        energy: [0.0, 0.3],
        valence: [0.2, 0.6],
        acousticness: [0.5, 1.0]  // 偏声学
      },
      party: {
        energy: [0.7, 1.0],
        danceability: [0.7, 1.0],
        valence: [0.6, 1.0]
      }
    };

    const range = sceneRanges[scene];
    if (!range) {
      return songs;
    }

    return songs.filter(song => {
      if (!song.spotifyFeatures || !song.spotifyFeatures.audioFeatures) {
        return false;
      }

      const features = song.spotifyFeatures.audioFeatures;

      // 检查所有条件
      for (const [key, [min, max]] of Object.entries(range)) {
        if (features[key] < min || features[key] > max) {
          return false;
        }
      }

      return true;
    });
  }
}

export default SpotifyService;
