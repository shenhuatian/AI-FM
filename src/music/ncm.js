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
   * 🔥 新增：检测同名歌曲
   * 搜索歌曲并返回不同艺术家的版本
   * @param {string} songName - 歌曲名称
   * @param {number} limit - 搜索数量
   * @returns {Promise<Array>} 不同艺术家的版本列表
   */
  async detectDuplicateSongs(songName, limit = 20) {
    try {
      console.log(`🔍 检测同名歌曲: ${songName}`);

      // 搜索歌曲
      const results = await this.search(songName, limit);

      if (results.length === 0) {
        return [];
      }

      // 过滤：只保留歌名完全匹配的
      const exactMatches = results.filter(song =>
        song.name.toLowerCase() === songName.toLowerCase()
      );

      if (exactMatches.length === 0) {
        console.log(`⚠️ 没有完全匹配的歌曲`);
        return [];
      }

      // 去重：每个艺术家只保留一个版本
      const uniqueVersions = [];
      const seenArtists = new Set();

      for (const song of exactMatches) {
        // 提取主要艺术家（第一个）
        const mainArtist = song.artist.split('/')[0].trim();

        if (!seenArtists.has(mainArtist)) {
          uniqueVersions.push({
            ...song,
            mainArtist: mainArtist
          });
          seenArtists.add(mainArtist);
        }
      }

      console.log(`✅ 找到 ${uniqueVersions.length} 个不同艺术家的版本`);
      uniqueVersions.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.mainArtist} - ${v.name}`);
      });

      return uniqueVersions;
    } catch (error) {
      console.error(`❌ 检测同名歌曲失败:`, error.message);
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
      // 🔥 改进搜索关键词策略
      let keyword;
      let searchLimit = 20;

      // 特殊处理"群星"类型的歌曲
      if (artistName && (artistName.includes('群星') || artistName.includes('合唱'))) {
        // 对于群星歌曲，只搜索歌名，增加搜索结果数量
        keyword = songName;
        searchLimit = 50;
        console.log(`🎤 检测到群星歌曲，使用歌名搜索，增加搜索范围`);
      } else if (artistName) {
        // 普通歌曲，使用"歌名 歌手"搜索
        keyword = `${songName} ${artistName}`;
      } else {
        keyword = songName;
      }

      const results = await this.search(keyword, searchLimit);

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
        } else if (artistName && (targetArtist.includes('群星') || targetArtist.includes('合唱'))) {
          // 🔥 特殊处理群星歌曲：如果艺术家包含多个歌手（用/分隔），给予高分
          const artistCount = sArtist.split('/').length;
          if (artistCount >= 3) {
            score += 180; // 多个艺术家的合唱，很可能是群星歌曲
            console.log(`   🎤 检测到多艺术家合唱 (${artistCount}人): ${s.artist}`);
          } else if (artistCount >= 2) {
            score += 120; // 两个艺术家的合唱
          }
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

        // 🔥 新增：检测用户上传版本（增强版）
        const isLikelyUserUpload = (artist) => {
          const userUploadKeywords = [
            // 翻唱相关
            '小迷妹', '小迷弟', '翻唱', '的粉丝', '爱好者',
            'cover', 'Cover', 'COVER', '翻唱团', '合唱团',
            '致敬', '模仿', '学唱', '翻唱版',
            // 工作室/团队
            '工作室', '众手', '歪歪', '替云', '蛋姐',
            '音乐社', '音乐会', '演唱会', '乐队', '组合',
            // 地名（通常是用户上传）
            '广东', '四川', '北京', '上海', '重庆', '深圳', '成都',
            // 🔥 新增：更多用户上传特征
            '宝藏音乐盒', '玉藏音乐盒', '王藏音乐盒', '宝藏', '音乐盒',
            '自己', '我自己', '本人', '原创', '改编',
            '网友', '歌迷', '粉丝', '听众',
            'remix', 'Remix', 'REMIX', 'mix',
            '伴奏', '纯音乐', '钢琴版', '吉他版', '古筝版',
            '男生版', '女生版', '男声版', '女声版',
            '完整版', '高清版', '无损版', '现场版'
          ];

          return userUploadKeywords.some(k => artist.includes(k));
        };

        if (isLikelyUserUpload(sArtist)) {
          score -= 500; // 🔥 大幅降低用户上传版本的分数（从200改为500）
          console.log(`   ⚠️ 疑似用户上传: ${s.artist}`);
        }

        // 4. VIP状态评分（轻微优先非VIP，但不完全排除VIP）
        if (!s.vip) {
          score += 20; // 只加20分，不是100分
        }

        // 5. 艺术家名称质量（排除明显的翻唱者）
        // 🔥 修改：如果是群星歌曲，多个艺术家是正常的，不扣分
        if (!(targetArtist.includes('群星') || targetArtist.includes('合唱'))) {
          if (sArtist.includes('/') && sArtist.split('/').length > 2) {
            score -= 20; // 多个艺术家可能是合唱或翻唱
          }
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

          // 🔥 方案3：检测用户上传版本并提示
          const isLikelyUserUpload = (artist) => {
            const userUploadKeywords = [
              '小迷妹', '小迷弟', '翻唱', '的粉丝', '爱好者',
              '工作室', '众手', '歪歪', '替云', '蛋姐',
              'cover', 'Cover', 'COVER',
              '广东', '四川', '北京', '上海', '重庆',
              '翻唱团', '合唱团', '乐队', '组合',
              '音乐社', '音乐会', '演唱会',
              '致敬', '模仿', '学唱'
            ];
            return userUploadKeywords.some(k => artist.includes(k));
          };

          if (artistName && isLikelyUserUpload(song.artist)) {
            console.log(`⚠️ 警告：找到的歌曲可能是用户上传版本`);
            console.log(`   原因：艺术家名称 "${song.artist}" 疑似非官方`);
            console.log(`   建议：可能是版权问题，网易云没有官方版本`);

            // 🔥 尝试查找替代歌曲
            const alternative = await this.findAlternative(artistName, song.id);

            if (alternative) {
              // 标记为替代歌曲
              alternative.isReplacement = true;
              alternative.originalName = songName;
              return alternative;
            }

            // 找不到替代，标记为用户上传版本
            song.isUserUpload = true;
            song.uploadWarning = `注意：这可能是用户上传的翻唱版本，不是 ${artistName} 的官方版本`;
          }

          // 返回正常歌曲
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
   * 🔥 查找替代歌曲（当原歌曲是用户上传版本时）
   * @param {string} artistName - 艺术家名称
   * @param {string} seedSongId - 种子歌曲ID（用于相似推荐）
   * @returns {Promise<Object|null>} 替代歌曲
   */
  async findAlternative(artistName, seedSongId) {
    console.log(`\n🔄 查找替代歌曲: ${artistName}`);

    const isLikelyUserUpload = (artist) => {
      const userUploadKeywords = [
        '小迷妹', '小迷弟', '翻唱', '的粉丝', '爱好者',
        '工作室', '众手', '歪歪', '替云', '蛋姐',
        'cover', 'Cover', 'COVER',
        '广东', '四川', '北京', '上海', '重庆',
        '翻唱团', '合唱团', '乐队', '组合',
        '音乐社', '音乐会', '演唱会',
        '致敬', '模仿', '学唱'
      ];
      return userUploadKeywords.some(k => artist.includes(k));
    };

    // 第1层：相似歌曲推荐
    try {
      console.log('🔄 第1层：尝试相似歌曲推荐');
      const similarSongs = await this.getSimilarSongs(seedSongId, 10);

      for (const song of similarSongs) {
        if (!isLikelyUserUpload(song.artist)) {
          song.url = await this.getSongUrl(song.id, 'standard');
          if (song.url) {
            console.log(`✅ 找到替代歌曲（相似）: ${song.name} - ${song.artist}`);
            return song;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ 相似歌曲推荐失败:', error.message);
    }

    // 第2层：同艺术家热门歌曲
    try {
      console.log('🔄 第2层：尝试同艺术家热门歌曲');
      const artistSongs = await this.search(artistName, 20);

      for (const song of artistSongs) {
        if (!isLikelyUserUpload(song.artist) && song.artist.includes(artistName)) {
          song.url = await this.getSongUrl(song.id, 'standard');
          if (song.url) {
            console.log(`✅ 找到替代歌曲（同艺术家）: ${song.name} - ${song.artist}`);
            return song;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ 同艺术家推荐失败:', error.message);
    }

    console.log('❌ 未找到替代歌曲');
    return null;
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
   * 🔥 新增：获取艺术家的所有专辑
   */
  async getArtistAlbums(artistId, limit = 50) {
    try {
      const url = `${this.baseUrl}/artist/album?id=${artistId}&limit=${limit}`;
      console.log(`🔍 获取艺术家专辑: artistId=${artistId}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.hotAlbums || data.hotAlbums.length === 0) {
        console.log(`⚠️ 未找到艺术家专辑`);
        return [];
      }

      console.log(`✅ 找到 ${data.hotAlbums.length} 张专辑`);

      return data.hotAlbums.map(album => ({
        id: album.id,
        name: album.name,
        picUrl: album.picUrl || null,
        size: album.size || 0,
        publishTime: album.publishTime || 0
      }));
    } catch (error) {
      console.error(`❌ 获取艺术家专辑失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：获取专辑的所有歌曲
   */
  async getAlbumSongs(albumId) {
    try {
      const url = `${this.baseUrl}/album?id=${albumId}`;
      console.log(`🔍 获取专辑歌曲: albumId=${albumId}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.songs || data.songs.length === 0) {
        console.log(`⚠️ 未找到专辑歌曲`);
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
        vip: song.fee === 1 || song.fee === 4
      }));
    } catch (error) {
      console.error(`❌ 获取专辑歌曲失败:`, error.message);
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

  /**
   * 🔥 新增：获取私人 FM
   * @returns {Promise<Array>} 推荐的歌曲列表
   */
  async getPersonalFM() {
    try {
      const cookieParam = `?cookie=${encodeURIComponent(this.cookie)}`;
      const url = `${this.baseUrl}/personal_fm${cookieParam}`;
      console.log(`🎵 获取私人 FM`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.data || data.data.length === 0) {
        console.log(`⚠️ 私人 FM 无数据`);
        return [];
      }

      console.log(`✅ 获取到 ${data.data.length} 首私人 FM 推荐`);

      return data.data.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artists ? song.artists.map(a => a.name).join('/') : '未知艺术家',
        album: song.album ? song.album.name : '未知专辑',
        albumPic: song.album && song.album.picUrl ? song.album.picUrl : null,
        duration: song.duration || 0,
        url: null,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4
      }));
    } catch (error) {
      console.error(`❌ 获取私人 FM 失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：获取精品歌单
   * @param {string} category - 分类（全部、华语、欧美、流行、摇滚、民谣、电子、爵士等）
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>} 精品歌单列表
   */
  async getHighQualityPlaylists(category = '全部', limit = 10) {
    try {
      const url = `${this.baseUrl}/top/playlist/highquality?cat=${encodeURIComponent(category)}&limit=${limit}`;
      console.log(`🎵 获取精品歌单: category=${category}, limit=${limit}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.playlists || data.playlists.length === 0) {
        console.log(`⚠️ 未找到精品歌单`);
        return [];
      }

      console.log(`✅ 获取到 ${data.playlists.length} 个精品歌单`);

      return data.playlists.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        coverImgUrl: playlist.coverImgUrl || null,
        trackCount: playlist.trackCount || 0,
        playCount: playlist.playCount || 0,
        description: playlist.description || '',
        tags: playlist.tags || [],
        creator: playlist.creator?.nickname || '未知'
      }));
    } catch (error) {
      console.error(`❌ 获取精品歌单失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：获取歌单的所有歌曲
   * @param {string} playlistId - 歌单 ID
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>} 歌单歌曲列表
   */
  async getPlaylistTracks(playlistId, limit = 50) {
    try {
      const url = `${this.baseUrl}/playlist/track/all?id=${playlistId}&limit=${limit}`;
      console.log(`🎵 获取歌单歌曲: playlistId=${playlistId}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.songs || data.songs.length === 0) {
        console.log(`⚠️ 歌单无歌曲`);
        return [];
      }

      console.log(`✅ 获取到 ${data.songs.length} 首歌曲`);

      return data.songs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.ar ? song.ar.map(a => a.name).join('/') : '未知艺术家',
        album: song.al ? song.al.name : '未知专辑',
        albumPic: song.al && song.al.picUrl ? song.al.picUrl : null,
        duration: song.dt || 0,
        url: null,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4
      }));
    } catch (error) {
      console.error(`❌ 获取歌单歌曲失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：获取每日推荐歌曲
   * @returns {Promise<Array>} 每日推荐歌曲列表
   */
  async getDailyRecommendSongs() {
    try {
      const cookieParam = `?cookie=${encodeURIComponent(this.cookie)}`;
      const url = `${this.baseUrl}/recommend/songs${cookieParam}`;
      console.log(`🎵 获取每日推荐歌曲`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.data || !data.data.dailySongs || data.data.dailySongs.length === 0) {
        console.log(`⚠️ 每日推荐无数据`);
        return [];
      }

      console.log(`✅ 获取到 ${data.data.dailySongs.length} 首每日推荐`);

      return data.data.dailySongs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.ar ? song.ar.map(a => a.name).join('/') : '未知艺术家',
        album: song.al ? song.al.name : '未知专辑',
        albumPic: song.al && song.al.picUrl ? song.al.picUrl : null,
        duration: song.dt || 0,
        url: null,
        fee: song.fee || 0,
        vip: song.fee === 1 || song.fee === 4
      }));
    } catch (error) {
      console.error(`❌ 获取每日推荐失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：获取推荐新歌
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>} 推荐新歌列表
   */
  async getRecommendNewSongs(limit = 10) {
    try {
      const url = `${this.baseUrl}/personalized/newsong?limit=${limit}`;
      console.log(`🎵 获取推荐新歌: limit=${limit}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.code !== 200 || !data.result || data.result.length === 0) {
        console.log(`⚠️ 推荐新歌无数据`);
        return [];
      }

      console.log(`✅ 获取到 ${data.result.length} 首推荐新歌`);

      return data.result.map(item => {
        const song = item.song;
        return {
          id: song.id,
          name: song.name,
          artist: song.artists ? song.artists.map(a => a.name).join('/') : '未知艺术家',
          album: song.album ? song.album.name : '未知专辑',
          albumPic: song.album && song.album.picUrl ? song.album.picUrl : null,
          duration: song.duration || 0,
          url: null,
          fee: song.fee || 0,
          vip: song.fee === 1 || song.fee === 4
        };
      });
    } catch (error) {
      console.error(`❌ 获取推荐新歌失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：根据意图智能获取候选歌曲（智能混合推荐）
   * @param {Object} intent - 用户意图
   * @param {Object} userProfile - 用户画像（可选）
   * @param {string} lastPlayedSongId - 上一首歌的 ID（可选）
   * @param {number} limit - 候选歌曲数量
   * @returns {Promise<Array>} 候选歌曲列表
   */
  async getCandidatesByIntent(intent, userProfile = null, lastPlayedSongId = null, limit = 80) {
    try {
      console.log(`\n🎯 智能混合候选池构建:`);
      console.log(`   意图:`, JSON.stringify(intent, null, 2));
      console.log(`   目标候选数: ${limit}`);

      const pools = [];

      // 🔥 策略 1: 用户指定了艺术家（精确搜索）
      if (intent.artist) {
        console.log(`🎤 策略 1: 搜索艺术家 "${intent.artist}"`);

        // 搜索艺术家
        const artists = await this.searchArtist(intent.artist, 1);

        if (artists.length > 0) {
          const artistId = artists[0].id;
          console.log(`   找到艺术家: ${artists[0].name} (ID: ${artistId})`);

          // 获取艺术家的歌曲
          if (intent.freshness === 'fresh') {
            // 用户想要新鲜的 → 获取所有专辑，挑选深度曲目
            console.log(`   获取艺术家的所有专辑（深度曲目）`);
            const albums = await this.getArtistAlbums(artistId, 10);

            for (const album of albums) {
              const songs = await this.getAlbumSongs(album.id);
              pools.push(...songs);

              if (pools.length >= limit) break;
            }
          } else {
            // 普通请求 → 获取热门歌曲
            console.log(`   获取艺术家热门歌曲`);
            const songs = await this.getArtistTopSongs(artistId, limit);
            pools.push(...songs);
          }
        } else {
          console.log(`   ⚠️ 未找到艺术家，尝试搜索`);
          const songs = await this.search(intent.artist, limit);
          pools.push(...songs);
        }

        // 如果指定了艺术家，直接返回（不混合其他来源）
        return this.deduplicateSongs(pools).slice(0, limit);
      }

      // 🔥 策略 2: 用户有明确的心情/风格需求
      if (intent.mood || intent.style.length > 0) {
        console.log(`🎭 策略 2: 根据心情/风格获取歌曲`);

        // 映射心情到网易云分类
        const category = this.mapMoodToCategory(intent.mood, intent.style);
        console.log(`   映射分类: ${category}`);

        // 获取精品歌单（60% 的候选池）
        const playlistLimit = Math.ceil(limit * 0.6);
        const playlists = await this.getHighQualityPlaylists(category, 3);

        if (playlists.length > 0) {
          console.log(`   找到 ${playlists.length} 个精品歌单`);

          for (const playlist of playlists) {
            const songs = await this.getPlaylistTracks(playlist.id, Math.ceil(playlistLimit / playlists.length));
            pools.push(...songs);

            if (pools.length >= playlistLimit) break;
          }
        }
      }

      // 🔥 策略 3: 补充私人 FM（20% 的候选池，个性化）
      if (this.cookie && pools.length < limit) {
        console.log(`🎵 策略 3: 补充私人 FM`);
        const fmLimit = Math.ceil(limit * 0.2);
        const fmSongs = await this.getPersonalFM();
        pools.push(...fmSongs.slice(0, fmLimit));
      }

      // 🔥 策略 4: 补充每日推荐（10% 的候选池，长期偏好）
      if (this.cookie && pools.length < limit) {
        console.log(`📅 策略 4: 补充每日推荐`);
        const dailyLimit = Math.ceil(limit * 0.1);
        const dailySongs = await this.getDailyRecommendSongs();
        pools.push(...dailySongs.slice(0, dailyLimit));
      }

      // 🔥 策略 5: 补充相似歌曲（10% 的候选池，延续性）
      if (lastPlayedSongId && pools.length < limit) {
        console.log(`🔄 策略 5: 补充相似歌曲`);
        const similarLimit = Math.ceil(limit * 0.1);
        const similarSongs = await this.getSimilarSongs(lastPlayedSongId, similarLimit);
        pools.push(...similarSongs);
      }

      // 🔥 策略 6: 如果候选池不足，补充推荐新歌
      if (pools.length < limit) {
        console.log(`🆕 策略 6: 补充推荐新歌`);
        const remaining = limit - pools.length;
        const newSongs = await this.getRecommendNewSongs(remaining);
        pools.push(...newSongs);
      }

      // 去重
      const uniqueCandidates = this.deduplicateSongs(pools);

      console.log(`✅ 候选池构建完成: ${uniqueCandidates.length} 首（去重后）`);

      return uniqueCandidates.slice(0, limit);
    } catch (error) {
      console.error(`❌ 构建候选池失败:`, error.message);
      return [];
    }
  }

  /**
   * 🔥 新增：去重歌曲（根据歌曲 ID）
   * @param {Array} songs - 歌曲列表
   * @returns {Array} 去重后的歌曲列表
   */
  deduplicateSongs(songs) {
    const uniqueSongs = [];
    const seenIds = new Set();

    for (const song of songs) {
      if (!seenIds.has(song.id)) {
        seenIds.add(song.id);
        uniqueSongs.push(song);
      }
    }

    return uniqueSongs;
  }

  /**
   * 🔥 新增：映射心情/风格到网易云分类
   * @param {string} mood - 心情
   * @param {Array} styles - 风格列表
   * @returns {string} 网易云分类
   */
  mapMoodToCategory(mood, styles = []) {
    // 心情映射
    const moodMap = {
      '欢快': '流行',
      '悲伤': '伤感',
      '放松': '轻音乐',
      '激动': '摇滚',
      '浪漫': '浪漫',
      '安静': '轻音乐',
      '兴奋': '电子',
      '怀旧': '怀旧',
      '充满活力': '流行',
      '平静': '轻音乐',
      '忧郁': '伤感'
    };

    // 风格映射
    const styleMap = {
      '流行': '流行',
      '摇滚': '摇滚',
      '民谣': '民谣',
      '电子': '电子',
      '爵士': '爵士',
      '古典': '古典',
      '说唱': '说唱',
      '轻音乐': '轻音乐',
      '华语': '华语',
      '欧美': '欧美',
      '日语': '日语',
      '韩语': '韩语'
    };

    // 优先使用风格
    if (styles.length > 0) {
      for (const style of styles) {
        if (styleMap[style]) {
          return styleMap[style];
        }
      }
    }

    // 使用心情
    if (mood && moodMap[mood]) {
      return moodMap[mood];
    }

    // 默认返回"全部"
    return '全部';
  }
}

export default NeteaseCloudMusic;
