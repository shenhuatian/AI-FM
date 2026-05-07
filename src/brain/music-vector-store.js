import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MusicVectorStore {
  constructor() {
    this.songs = [];
    this.index = null;
  }

  async initialize() {
    try {
      const libraryPath = path.join(__dirname, '../../user/my-music-library.json');

      if (!fs.existsSync(libraryPath)) {
        console.warn('⚠️  未找到音乐库文件');
        return;
      }

      const library = JSON.parse(fs.readFileSync(libraryPath, 'utf-8'));

      // 合并所有歌曲源，去重
      const allSongs = new Map();

      // 1. 喜欢的歌曲（最高优先级）
      if (library.likedSongs) {
        library.likedSongs.forEach(song => {
          allSongs.set(song.id, { ...song, source: 'liked' });
        });
      }

      // 2. 听歌排行
      if (library.topSongs) {
        library.topSongs.forEach(song => {
          if (!allSongs.has(song.id)) {
            allSongs.set(song.id, { ...song, source: 'top' });
          }
        });
      }

      // 3. 最近播放（新增，约400首）
      if (library.recentSongs) {
        library.recentSongs.forEach(song => {
          if (!allSongs.has(song.id)) {
            allSongs.set(song.id, { ...song, source: 'recent' });
          }
        });
      }

      // 4. 歌单中的歌曲
      if (library.playlists) {
        library.playlists.forEach(playlist => {
          if (playlist.songs) {
            playlist.songs.forEach(song => {
              if (!allSongs.has(song.id)) {
                allSongs.set(song.id, { ...song, source: 'playlist' });
              }
            });
          }
        });
      }

      this.songs = Array.from(allSongs.values());

      console.log(`✅ 已加载 ${this.songs.length} 首歌曲`);
      console.log(`   - 喜欢的: ${library.likedSongs?.length || 0} 首`);
      console.log(`   - 常听的: ${library.topSongs?.length || 0} 首`);
      console.log(`   - 最近播放: ${library.recentSongs?.length || 0} 首`);
      console.log(`   - 去重后总计: ${this.songs.length} 首`);

      this.buildIndex();
    } catch (error) {
      console.error('❌ 音乐库加载失败:', error);
      throw error;
    }
  }

  buildIndex() {
    this.index = this.songs.map((song, idx) => {
      const text = `${song.name} ${song.artist} ${song.album}`.toLowerCase();
      const tokens = this.tokenize(text);
      return { idx, tokens, song };
    });
    console.log(`📚 已为 ${this.index.length} 首歌曲建立索引`);
  }

  tokenize(text) {
    return text.split(/\s+/).filter(t => t.length > 0);
  }

  calculateScore(queryTokens, docTokens) {
    let score = 0;
    const docSet = new Set(docTokens);

    for (const token of queryTokens) {
      if (docSet.has(token)) {
        score += 2;
      } else {
        for (const docToken of docTokens) {
          if (docToken.includes(token) || token.includes(docToken)) {
            score += 1;
            break;
          }
        }
      }
    }

    return score;
  }

  async semanticSearch(query, k = 10) {
    if (!this.index || this.index.length === 0) {
      console.warn('⚠️  索引未初始化，返回空结果');
      return [];
    }

    try {
      const queryTokens = this.tokenize(query.toLowerCase());
      const scored = this.index.map(item => ({
        song: item.song,
        score: this.calculateScore(queryTokens, item.tokens)
      }));

      scored.sort((a, b) => b.score - a.score);

      return scored
        .filter(item => item.score > 0)
        .slice(0, k)
        .map(item => item.song);
    } catch (error) {
      console.error('❌ 搜索失败:', error);
      return [];
    }
  }

  async searchByMood(mood, k = 10) {
    const moodQueries = {
      '开心': '欢快 轻松 愉悦 活力 阳光',
      '悲伤': '忧郁 伤感 失落 孤独 思念',
      '平静': '安静 舒缓 放松 治愈 温柔',
      '激动': '激情 热血 振奋 力量 摇滚',
      '浪漫': '爱情 温馨 甜蜜 柔情 情歌',
      '怀旧': '回忆 经典 老歌 青春 往事'
    };

    const query = moodQueries[mood] || mood;
    return await this.semanticSearch(query, k);
  }

  searchByArtist(artist, k = 10) {
    return this.songs
      .filter(song => song.artist.toLowerCase().includes(artist.toLowerCase()))
      .slice(0, k);
  }

  searchByName(name, k = 10) {
    return this.songs
      .filter(song => song.name.toLowerCase().includes(name.toLowerCase()))
      .slice(0, k);
  }

  getSongById(id) {
    return this.songs.find(song => song.id === id);
  }

  getAllSongs() {
    return this.songs;
  }

  getRandomSongs(k = 10) {
    const shuffled = [...this.songs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, k);
  }

  getStats() {
    return {
      totalSongs: this.songs.length,
      hasIndex: this.index !== null
    };
  }
}

export default new MusicVectorStore();
