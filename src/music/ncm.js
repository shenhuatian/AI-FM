// 网易云音乐API封装 - 完全重写版本
import fetch from 'node-fetch';

export class NeteaseCloudMusic {
  constructor(cookie = '') {
    this.cookie = cookie;
    this.timeout = 15000;
    this.baseUrl = 'http://localhost:3000';
    this.retryCount = 2;
  }

  async fetchWithRetry(url, options = {}, retries = this.retryCount) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': this.cookie || ''
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0 && error.name !== 'AbortError') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  /**
   * 搜索歌曲 - 使用cloudsearch接口
   */
  async search(keyword, limit = 10) {
    try {
      // 🔥 关键修复：将Cookie作为URL参数传递
      const cookieParam = this.cookie ? `&cookie=${encodeURIComponent(this.cookie)}` : '';
      const url = `${this.baseUrl}/cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=${limit}&type=1${cookieParam}`;
      console.log(`🔍 搜索: ${keyword}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200) {
        console.error(`❌ 搜索失败: code=${data.code}, message=${data.message || '未知错误'}`);
        return [];
      }

      if (!data.result || !data.result.songs || data.result.songs.length === 0) {
        console.log(`⚠️ 未找到歌曲: ${keyword}`);
        return [];
      }

      console.log(`✅ 找到 ${data.result.songs.length} 首歌曲`);

      return data.result.songs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.ar ? song.ar.map(a => a.name).join('/') : '未知艺术家',
        album: song.al ? song.al.name : '未知专辑',
        albumPic: song.al && song.al.picUrl ? song.al.picUrl : null,
        duration: song.dt || 0,
        url: null,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4,
        privilege: song.privilege || null
      }));
    } catch (error) {
      console.error(`❌ 搜索失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取歌曲播放URL - 支持多种音质和VIP歌曲
   */
  async getSongUrl(id, level = 'standard') {
    try {
      // 🔥 关键修复：将Cookie作为URL参数传递
      const cookieParam = this.cookie ? `&cookie=${encodeURIComponent(this.cookie)}` : '';
      const url = `${this.baseUrl}/song/url/v1?id=${id}&level=${level}${cookieParam}`;
      console.log(`🎵 获取播放链接: id=${id}, level=${level}, Cookie长度: ${this.cookie ? this.cookie.length : 0}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200) {
        console.error(`❌ 获取播放链接失败: code=${data.code}`);
        return null;
      }

      if (!data.data || data.data.length === 0) {
        console.log(`⚠️ 无播放数据`);

        // 如果当前音质不可用，尝试降级
        if (level === 'exhigh') {
          console.log(`⚠️ 尝试降级到 higher`);
          return await this.getSongUrl(id, 'higher');
        } else if (level === 'higher') {
          console.log(`⚠️ 尝试降级到 standard`);
          return await this.getSongUrl(id, 'standard');
        }

        return null;
      }

      const songData = data.data[0];

      // 检查是否有URL
      if (!songData.url) {
        console.log(`⚠️ 歌曲 ${id} 无播放链接 (可能是VIP歌曲或版权限制)`);

        // 尝试降级音质
        if (level !== 'standard') {
          console.log(`⚠️ 尝试降级音质`);
          return await this.getSongUrl(id, 'standard');
        }

        return null;
      }

      // 检查VIP状态和试听信息
      const isVIP = songData.fee === 1;
      const isPayed = songData.payed === 1;
      const isTrial = songData.freeTrialInfo && songData.freeTrialInfo.end > 0;

      if (isVIP) {
        if (isPayed && !isTrial) {
          console.log(`✅ VIP歌曲 - 完整版本 (已付费)`);
        } else if (isTrial) {
          console.log(`⚠️ VIP歌曲 - 试听版本 (${songData.freeTrialInfo.end / 1000}秒)`);
          console.log(`💡 提示: Cookie可能无效或VIP已过期`);
        } else {
          console.log(`⚠️ VIP歌曲 - 未付费`);
        }
      } else {
        console.log(`✅ 免费歌曲 - 完整播放`);
      }

      console.log(`✅ 播放链接: ${songData.url.substring(0, 60)}...`);
      console.log(`   码率: ${songData.br}, 大小: ${(songData.size / 1024 / 1024).toFixed(2)}MB`);

      return songData.url;
    } catch (error) {
      console.error(`❌ 获取播放链接失败:`, error.message);
      return null;
    }
  }

  /**
   * 验证Cookie是否有效
   */
  async validateCookie() {
    try {
      if (!this.cookie) {
        console.log(`⚠️ 未配置Cookie`);
        return false;
      }

      const cookieParam = `?cookie=${encodeURIComponent(this.cookie)}`;
      const url = `${this.baseUrl}/login/status${cookieParam}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.data && data.data.account) {
        const nickname = data.data.profile?.nickname || '未知用户';
        const vipType = data.data.account.vipType;
        const isVIP = vipType === 11;

        console.log(`✅ Cookie有效`);
        console.log(`   用户: ${nickname}`);
        console.log(`   VIP类型: ${vipType} ${isVIP ? '(VIP会员)' : '(普通用户)'}`);
        console.log(`   用户ID: ${data.data.account.id}`);

        return true;
      } else {
        console.log(`❌ Cookie无效或已过期`);
        return false;
      }
    } catch (error) {
      console.error(`❌ 验证Cookie失败:`, error.message);
      return false;
    }
  }

  /**
   * 获取歌曲详情
   */
  async getSongDetail(id) {
    try {
      const url = `${this.baseUrl}/song/detail?ids=${id}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.songs || data.songs.length === 0) {
        return null;
      }

      const song = data.songs[0];
      return {
        id: song.id,
        name: song.name,
        artist: song.ar.map(a => a.name).join('/'),
        album: song.al.name,
        albumPic: song.al.picUrl || null,
        duration: song.dt,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4
      };
    } catch (error) {
      console.error(`❌ 获取歌曲详情失败:`, error.message);
      return null;
    }
  }

  /**
   * 检查歌曲是否可播放
   */
  async checkSongAvailable(id) {
    try {
      const url = `${this.baseUrl}/check/music?id=${id}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      return data.success === true;
    } catch (error) {
      console.error(`❌ 检查歌曲可用性失败:`, error.message);
      return false;
    }
  }

  /**
   * 查找歌曲 - 简化版（精确匹配优先）
   */
  async findSong(songName, artistName = '') {
    console.log(`\n🔍 查找: ${songName}${artistName ? ' - ' + artistName : ''}`);

    try {
      // 构建搜索关键词
      const keyword = artistName ? `${songName} ${artistName}` : songName;
      const results = await this.search(keyword, 20);

      if (results.length === 0) {
        console.log(`❌ 未找到歌曲`);
        return null;
      }

      // 智能评分函数：平衡VIP和非VIP，优先原版
      const scoreSong = (s) => {
        let score = 0;
        const sName = s.name.toLowerCase().trim();
        const sArtist = s.artist.toLowerCase().trim();
        const targetName = songName.toLowerCase().trim();
        const targetArtist = artistName.toLowerCase().trim();

        // 1. 歌名匹配度（最高100分）
        if (sName === targetName) {
          score += 100;
        } else if (sName.replace(/\(.*?\)/g, '').trim() === targetName) {
          score += 90;
        } else if (sName.includes(targetName)) {
          score += 50;
        }

        // 2. 艺术家匹配度（最高200分，最重要）
        if (artistName && sArtist === targetArtist) {
          score += 200;
        } else if (artistName && sArtist.includes(targetArtist)) {
          score += 150;
        }

        // 3. 版本类型评分（优先原版）
        const lowerName = sName.toLowerCase();

        // Live版本 -30分（除非用户明确要求）
        if (lowerName.includes('live') && !targetName.includes('live')) {
          score -= 30;
        }

        // 翻唱版本 -40分
        if (lowerName.includes('翻唱') || lowerName.includes('cover')) {
          score -= 40;
        }

        // DJ版本、Remix -35分
        if (lowerName.includes('dj') || lowerName.includes('remix')) {
          score -= 35;
        }

        // 钢琴版、吉他版等乐器版本 -25分
        if (lowerName.includes('钢琴版') || lowerName.includes('吉他版')) {
          score -= 25;
        }

        // 4. VIP状态评分（轻微优先非VIP，但不完全排除VIP）
        if (!s.vip) {
          score += 20; // 只加20分，不是100分
        }

        // 5. 艺术家名称质量（排除明显的翻唱者）
        if (sArtist.includes('/') && sArtist.split('/').length > 2) {
          score -= 20; // 多个艺术家可能是合唱或翻唱
        }

        // 6. 直接排除无用版本
        const excludeKeywords = ['伴奏', '铃声', '来电', '手机铃声', '纯音乐'];
        for (const keyword of excludeKeywords) {
          if (sName.includes(keyword)) {
            return -1000;
          }
        }

        return score;
      };

      // 评分并过滤
      const scoredResults = results
        .map(s => ({
          song: s,
          score: scoreSong(s)
        }))
        .filter(item => item.score > 0) // 过滤掉负分
        .sort((a, b) => b.score - a.score);

      if (scoredResults.length === 0) {
        console.log(`❌ 没有符合条件的歌曲`);
        return null;
      }

      console.log(`📊 匹配结果（前10）:`);
      scoredResults.slice(0, 10).forEach((item, i) => {
        const vipTag = item.song.vip ? '[VIP]' : '';
        const typeTag = item.song.name.includes('Live') ? '[Live]' :
                       item.song.name.includes('翻唱') ? '[翻唱]' :
                       item.song.name.includes('DJ') ? '[DJ]' : '';
        console.log(`   ${i + 1}. [${item.score}分] ${item.song.name} - ${item.song.artist} ${vipTag}${typeTag}`);
      });

      // 尝试前10个高分歌曲（增加尝试次数）
      for (const item of scoredResults.slice(0, 10)) {
        const song = item.song;
        console.log(`\n🎯 尝试: ${song.name} - ${song.artist}${song.vip ? ' [VIP]' : ''}`);

        // 尝试获取播放URL
        song.url = await this.getSongUrl(song.id, 'standard');

        if (song.url) {
          console.log(`✅ 成功获取播放链接`);

          // 获取专辑封面
          if (!song.albumPic) {
            const detail = await this.getSongDetail(song.id);
            if (detail && detail.albumPic) {
              song.albumPic = detail.albumPic;
            }
          }

          return song;
        } else {
          console.log(`⚠️ 无法获取播放链接，尝试下一首`);
        }
      }

      console.log(`❌ 所有候选歌曲都无法播放`);
      return null;
    } catch (error) {
      console.error(`❌ 查找失败:`, error.message);
      return null;
    }
  }

  /**
   * 获取歌词
   */
  async getLyric(id) {
    try {
      const url = `${this.baseUrl}/lyric?id=${id}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200) {
        return '暂无歌词';
      }

      return data.lrc?.lyric || '暂无歌词';
    } catch (error) {
      console.error(`❌ 获取歌词失败:`, error.message);
      return '暂无歌词';
    }
  }

  /**
   * 获取每日推荐
   */
  async getRecommend() {
    try {
      const url = `${this.baseUrl}/recommend/songs`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.data || !data.data.dailySongs) {
        return [];
      }

      return data.data.dailySongs.slice(0, 10).map(song => ({
        id: song.id,
        name: song.name,
        artist: song.ar.map(a => a.name).join('/'),
        album: song.al.name,
        albumPic: song.al.picUrl || null,
        duration: song.dt,
        url: null,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4
      }));
    } catch (error) {
      console.error(`❌ 获取推荐失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取相似歌曲推荐
   */
  async getSimilarSongs(songId, limit = 10) {
    try {
      const url = `${this.baseUrl}/simi/song?id=${songId}&limit=${limit}`;
      console.log(`🔍 获取相似歌曲: songId=${songId}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.songs || data.songs.length === 0) {
        console.log(`⚠️ 未找到相似歌曲`);
        return [];
      }

      console.log(`✅ 找到 ${data.songs.length} 首相似歌曲`);

      return data.songs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artists ? song.artists.map(a => a.name).join('/') : '未知艺术家',
        album: song.album ? song.album.name : '未知专辑',
        albumPic: song.album && song.album.picUrl ? song.album.picUrl : null,
        duration: song.duration || 0,
        url: null,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4,
        privilege: song.privilege || null
      }));
    } catch (error) {
      console.error(`❌ 获取相似歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取相似艺术家推荐
   */
  async getSimilarArtists(artistId, limit = 10) {
    try {
      const url = `${this.baseUrl}/simi/artist?id=${artistId}&limit=${limit}`;
      console.log(`🔍 获取相似艺术家: artistId=${artistId}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.artists || data.artists.length === 0) {
        console.log(`⚠️ 未找到相似艺术家`);
        return [];
      }

      console.log(`✅ 找到 ${data.artists.length} 位相似艺术家`);

      return data.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        picUrl: artist.picUrl || null,
        albumSize: artist.albumSize || 0
      }));
    } catch (error) {
      console.error(`❌ 获取相似艺术家失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取艺术家热门歌曲
   */
  async getArtistTopSongs(artistId, limit = 50) {
    try {
      const url = `${this.baseUrl}/artist/top/song?id=${artistId}&limit=${limit}`;
      console.log(`🔍 获取艺术家热门歌曲: artistId=${artistId}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.songs || data.songs.length === 0) {
        console.log(`⚠️ 未找到艺术家歌曲`);
        return [];
      }

      console.log(`✅ 找到 ${data.songs.length} 首歌曲`);

      return data.songs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.ar ? song.ar.map(a => a.name).join('/') : '未知艺术家',
        album: song.al ? song.al.name : '未知专辑',
        albumPic: song.al && song.al.picUrl ? song.al.picUrl : null,
        duration: song.dt || 0,
        url: null,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4,
        popularity: song.pop || 0
      }));
    } catch (error) {
      console.error(`❌ 获取艺术家歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 搜索艺术家
   */
  async searchArtist(keyword, limit = 10) {
    try {
      const url = `${this.baseUrl}/cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=${limit}&type=100`;
      console.log(`🔍 搜索艺术家: ${keyword}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.result || !data.result.artists || data.result.artists.length === 0) {
        console.log(`⚠️ 未找到艺术家`);
        return [];
      }

      console.log(`✅ 找到 ${data.result.artists.length} 位艺术家`);

      return data.result.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        picUrl: artist.picUrl || null,
        albumSize: artist.albumSize || 0
      }));
    } catch (error) {
      console.error(`❌ 搜索艺术家失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取用户账号信息
   */
  async getUserAccount() {
    try {
      const cookieParam = `?cookie=${encodeURIComponent(this.cookie)}`;
      const url = `${this.baseUrl}/user/account${cookieParam}`;
      console.log(`🔍 获取用户账号信息`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.account) {
        console.error(`❌ 获取账号信息失败: code=${data.code}`);
        return null;
      }

      console.log(`✅ 获取账号信息成功: ${data.profile?.nickname || '未知用户'} (uid: ${data.account.id})`);

      return {
        uid: data.account.id,
        nickname: data.profile?.nickname || '未知用户',
        avatarUrl: data.profile?.avatarUrl || null,
        vipType: data.account.vipType || 0,
        isVIP: data.account.vipType === 11
      };
    } catch (error) {
      console.error(`❌ 获取账号信息失败:`, error.message);
      return null;
    }
  }

  /**
   * 获取用户喜欢的音乐列表
   */
  async getUserLikedSongs(uid) {
    try {
      const cookieParam = `&cookie=${encodeURIComponent(this.cookie)}`;
      const url = `${this.baseUrl}/likelist?uid=${uid}${cookieParam}`;
      console.log(`🔍 获取用户喜欢的音乐: uid=${uid}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.ids) {
        console.error(`❌ 获取喜欢列表失败: code=${data.code}`);
        return [];
      }

      console.log(`✅ 获取到 ${data.ids.length} 首喜欢的歌曲`);

      return data.ids;
    } catch (error) {
      console.error(`❌ 获取喜欢列表失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取用户的歌单
   */
  async getUserPlaylists(uid) {
    try {
      const cookieParam = `&cookie=${encodeURIComponent(this.cookie)}`;
      const url = `${this.baseUrl}/user/playlist?uid=${uid}${cookieParam}`;
      console.log(`🔍 获取用户歌单: uid=${uid}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.playlist) {
        console.error(`❌ 获取歌单失败: code=${data.code}`);
        return [];
      }

      console.log(`✅ 获取到 ${data.playlist.length} 个歌单`);

      return data.playlist.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        coverImgUrl: playlist.coverImgUrl || null,
        trackCount: playlist.trackCount || 0,
        playCount: playlist.playCount || 0,
        creator: playlist.creator?.nickname || '未知',
        isOwn: playlist.userId === uid
      }));
    } catch (error) {
      console.error(`❌ 获取歌单失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取用户听歌排行
   * @param {number} uid - 用户ID
   * @param {number} type - 类型: 1=最近一周, 0=所有时间
   */
  async getUserPlayHistory(uid, type = 1) {
    try {
      const cookieParam = `&cookie=${encodeURIComponent(this.cookie)}`;
      const url = `${this.baseUrl}/user/record?uid=${uid}&type=${type}${cookieParam}`;
      const typeText = type === 1 ? '最近一周' : '所有时间';
      console.log(`🔍 获取用户听歌排行: uid=${uid}, type=${typeText}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200) {
        console.error(`❌ 获取听歌排行失败: code=${data.code}`);
        return [];
      }

      const recordList = type === 1 ? data.weekData : data.allData;

      if (!recordList || recordList.length === 0) {
        console.log(`⚠️ 暂无听歌记录`);
        return [];
      }

      console.log(`✅ 获取到 ${recordList.length} 条听歌记录`);

      return recordList.map(record => ({
        playCount: record.playCount || 0,
        score: record.score || 0,
        song: {
          id: record.song.id,
          name: record.song.name,
          artist: record.song.ar ? record.song.ar.map(a => a.name).join('/') : '未知艺术家',
          album: record.song.al ? record.song.al.name : '未知专辑',
          albumPic: record.song.al && record.song.al.picUrl ? record.song.al.picUrl : null,
          duration: record.song.dt || 0,
          fee: record.song.fee || 0,
          vip: record.song.fee === 1 || record.song.fee === 4
        }
      }));
    } catch (error) {
      console.error(`❌ 获取听歌排行失败:`, error.message);
      return [];
    }
  }
}

export default NeteaseCloudMusic;
