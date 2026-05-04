import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../../data/music-library.json');
const VERSION = '1.0';

class MusicLibrary {
  constructor() {
    this.data = null;
  }

  /**
   * 初始化音乐库，加载或创建数据文件
   */
  async init() {
    try {
      const content = await fs.readFile(DATA_FILE, 'utf-8');
      this.data = JSON.parse(content);
      console.log('[MusicLibrary] 音乐库数据已加载');
      return this.data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('[MusicLibrary] 数据文件不存在，创建新的音乐库');
        this.data = this._createEmptyData();
        await this._save();
        return this.data;
      }
      throw new Error(`初始化音乐库失败: ${error.message}`);
    }
  }

  /**
   * 完全导入音乐库数据（覆盖所有数据）
   * @param {Object} userData - 用户音乐数据
   * @param {Object} userData.user - 用户信息
   * @param {Array} userData.likedSongs - 喜欢的歌曲
   * @param {Array} userData.playlists - 歌单列表
   * @param {Object} userData.playHistory - 听歌历史
   */
  async importFull(userData) {
    if (!this.data) {
      await this.init();
    }

    const now = Date.now();
    this.data = {
      user: userData.user || null,
      likedSongs: userData.likedSongs || [],
      playlists: userData.playlists || [],
      playHistory: {
        week: userData.playHistory?.week || [],
        all: userData.playHistory?.all || []
      },
      importedAt: this.data?.importedAt || now,
      lastUpdatedAt: now,
      version: VERSION
    };

    await this._save();
    console.log('[MusicLibrary] 完全导入完成');
    return this.getStats();
  }

  /**
   * 增量更新音乐库数据（合并新数据）
   * @param {Object} userData - 用户音乐数据
   */
  async importIncremental(userData) {
    if (!this.data) {
      await this.init();
    }

    const now = Date.now();

    // 更新用户信息
    if (userData.user) {
      this.data.user = userData.user;
    }

    // 合并喜欢的歌曲（去重）
    if (userData.likedSongs && Array.isArray(userData.likedSongs)) {
      const existingIds = new Set(this.data.likedSongs);
      const newSongs = userData.likedSongs.filter(id => !existingIds.has(id));
      this.data.likedSongs = [...this.data.likedSongs, ...newSongs];
      console.log(`[MusicLibrary] 新增 ${newSongs.length} 首喜欢的歌曲`);
    }

    // 合并歌单（去重并更新）
    if (userData.playlists && Array.isArray(userData.playlists)) {
      const existingPlaylistMap = new Map(
        this.data.playlists.map(p => [p.id, p])
      );

      userData.playlists.forEach(playlist => {
        existingPlaylistMap.set(playlist.id, playlist);
      });

      this.data.playlists = Array.from(existingPlaylistMap.values());
      console.log(`[MusicLibrary] 歌单总数: ${this.data.playlists.length}`);
    }

    // 更新听歌历史（直接替换为最新数据）
    if (userData.playHistory) {
      if (userData.playHistory.week) {
        this.data.playHistory.week = userData.playHistory.week;
      }
      if (userData.playHistory.all) {
        this.data.playHistory.all = userData.playHistory.all;
      }
      console.log('[MusicLibrary] 听歌历史已更新');
    }

    // 更新时间戳
    if (!this.data.importedAt) {
      this.data.importedAt = now;
    }
    this.data.lastUpdatedAt = now;
    this.data.version = VERSION;

    await this._save();
    console.log('[MusicLibrary] 增量更新完成');
    return this.getStats();
  }

  /**
   * 获取音乐库统计信息
   */
  getStats() {
    if (!this.data) {
      return null;
    }

    return {
      user: this.data.user,
      likedSongsCount: this.data.likedSongs.length,
      playlistsCount: this.data.playlists.length,
      playHistoryWeekCount: this.data.playHistory.week.length,
      playHistoryAllCount: this.data.playHistory.all.length,
      importedAt: this.data.importedAt,
      lastUpdatedAt: this.data.lastUpdatedAt,
      version: this.data.version
    };
  }

  /**
   * 获取完整音乐库数据
   */
  getData() {
    return this.data;
  }

  /**
   * 清空音乐库
   */
  async clear() {
    this.data = this._createEmptyData();
    await this._save();
    console.log('[MusicLibrary] 音乐库已清空');
    return this.data;
  }

  /**
   * 创建空数据结构
   * @private
   */
  _createEmptyData() {
    return {
      user: null,
      likedSongs: [],
      playlists: [],
      playHistory: {
        week: [],
        all: []
      },
      importedAt: null,
      lastUpdatedAt: null,
      version: VERSION
    };
  }

  /**
   * 保存数据到文件
   * @private
   */
  async _save() {
    try {
      // 确保目录存在
      const dir = path.dirname(DATA_FILE);
      await fs.mkdir(dir, { recursive: true });

      // 保存数据
      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
      console.log('[MusicLibrary] 数据已保存');
    } catch (error) {
      throw new Error(`保存音乐库数据失败: ${error.message}`);
    }
  }
}

// 导出单例
const musicLibrary = new MusicLibrary();

export default musicLibrary;
