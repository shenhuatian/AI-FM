// Chroma 向量数据库服务 - 用于音乐语义搜索
import { ChromaClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';

export class ChromaMusicStore {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = 'music-library';
    this.initialized = false;
  }

  /**
   * 初始化 Chroma 客户端和集合
   */
  async init() {
    try {
      console.log('🎵 初始化 Chroma 向量数据库...');

      // 🔥 修复：使用默认配置（内存模式）
      this.client = new ChromaClient();

      // 创建 embedding 函数
      const embedder = new DefaultEmbeddingFunction();

      // 尝试获取现有集合，如果不存在则创建
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
          embeddingFunction: embedder
        });
        console.log('✅ Chroma 集合已存在，直接使用');
      } catch (error) {
        // 集合不存在，创建新集合
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: { description: '音乐库向量存储' },
          embeddingFunction: embedder
        });
        console.log('✅ Chroma 集合创建成功');
      }

      this.initialized = true;
      console.log('✅ Chroma 向量数据库初始化完成');
    } catch (error) {
      console.error('❌ Chroma 初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 添加歌曲到向量数据库
   * @param {Array} songs - 歌曲列表
   */
  async addSongs(songs) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      console.log(`🎵 添加 ${songs.length} 首歌曲到 Chroma...`);

      const documents = [];
      const metadatas = [];
      const ids = [];

      for (const song of songs) {
        // 构建文档文本（用于向量化）
        const doc = this.buildDocument(song);
        documents.push(doc);

        // 构建元数据
        const metadata = {
          name: song.name || '',
          artist: song.artist || '',
          album: song.album || '',
          genre: song.genre || '',
          year: song.year || 0,
          playCount: song.playCount || 0
        };
        metadatas.push(metadata);

        // 使用歌曲 ID 作为唯一标识
        ids.push(song.id.toString());
      }

      // 批量添加到 Chroma
      await this.collection.add({
        documents: documents,
        metadatas: metadatas,
        ids: ids
      });

      console.log(`✅ 成功添加 ${songs.length} 首歌曲到 Chroma`);
    } catch (error) {
      console.error('❌ 添加歌曲到 Chroma 失败:', error.message);
      throw error;
    }
  }

  /**
   * 构建歌曲文档（用于向量化）
   * @param {Object} song - 歌曲对象
   * @returns {string} 文档文本
   */
  buildDocument(song) {
    const parts = [];

    // 歌曲名（重复3次，增加权重）
    if (song.name) {
      parts.push(song.name, song.name, song.name);
    }

    // 艺术家（重复2次）
    if (song.artist) {
      parts.push(song.artist, song.artist);
    }

    // 专辑
    if (song.album) {
      parts.push(song.album);
    }

    // 风格
    if (song.genre) {
      parts.push(song.genre);
    }

    // 年代
    if (song.year) {
      parts.push(`${song.year}年代`);
    }

    // 情绪标签（如果有）
    if (song.mood) {
      parts.push(song.mood);
    }

    // 场景标签（如果有）
    if (song.scene) {
      parts.push(song.scene);
    }

    return parts.join(' ');
  }

  /**
   * 语义搜索歌曲
   * @param {string} query - 搜索查询
   * @param {number} limit - 返回数量
   * @param {Object} filter - 元数据过滤条件
   * @returns {Promise<Array>} 搜索结果
   */
  async search(query, limit = 10, filter = null) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      console.log(`🔍 Chroma 语义搜索: "${query}"`);

      const queryOptions = {
        queryTexts: [query],
        nResults: limit
      };

      // 添加过滤条件
      if (filter) {
        queryOptions.where = filter;
      }

      const results = await this.collection.query(queryOptions);

      if (!results || !results.ids || results.ids.length === 0) {
        console.log('⚠️ 未找到匹配结果');
        return [];
      }

      // 格式化结果
      const songs = [];
      const ids = results.ids[0];
      const metadatas = results.metadatas[0];
      const distances = results.distances[0];

      for (let i = 0; i < ids.length; i++) {
        songs.push({
          id: ids[i],
          ...metadatas[i],
          similarity: 1 - distances[i]  // 转换为相似度
        });
      }

      console.log(`✅ 找到 ${songs.length} 首歌曲`);
      return songs;
    } catch (error) {
      console.error('❌ Chroma 搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 按艺术家搜索
   * @param {string} artist - 艺术家名
   * @param {number} limit - 返回数量
   * @returns {Promise<Array>} 搜索结果
   */
  async searchByArtist(artist, limit = 10) {
    return await this.search(artist, limit, { artist: artist });
  }

  /**
   * 按风格搜索
   * @param {string} genre - 风格
   * @param {number} limit - 返回数量
   * @returns {Promise<Array>} 搜索结果
   */
  async searchByGenre(genre, limit = 10) {
    return await this.search(genre, limit, { genre: genre });
  }

  /**
   * 按年代搜索
   * @param {number} year - 年份
   * @param {number} limit - 返回数量
   * @returns {Promise<Array>} 搜索结果
   */
  async searchByYear(year, limit = 10) {
    return await this.search(`${year}年`, limit, { year: year });
  }

  /**
   * 获取相似歌曲
   * @param {string} songId - 歌曲 ID
   * @param {number} limit - 返回数量
   * @returns {Promise<Array>} 相似歌曲列表
   */
  async getSimilarSongs(songId, limit = 10) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      console.log(`🔍 查找相似歌曲: ${songId}`);

      // 先获取目标歌曲的信息
      const targetSong = await this.collection.get({
        ids: [songId.toString()]
      });

      if (!targetSong || !targetSong.documents || targetSong.documents.length === 0) {
        console.log('⚠️ 未找到目标歌曲');
        return [];
      }

      // 使用目标歌曲的文档进行搜索
      const query = targetSong.documents[0];
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit + 1  // +1 因为会包含自己
      });

      if (!results || !results.ids || results.ids.length === 0) {
        return [];
      }

      // 格式化结果并排除自己
      const songs = [];
      const ids = results.ids[0];
      const metadatas = results.metadatas[0];
      const distances = results.distances[0];

      for (let i = 0; i < ids.length; i++) {
        if (ids[i] !== songId.toString()) {
          songs.push({
            id: ids[i],
            ...metadatas[i],
            similarity: 1 - distances[i]
          });
        }
      }

      console.log(`✅ 找到 ${songs.length} 首相似歌曲`);
      return songs.slice(0, limit);
    } catch (error) {
      console.error('❌ 查找相似歌曲失败:', error.message);
      return [];
    }
  }

  /**
   * 更新歌曲信息
   * @param {string} songId - 歌曲 ID
   * @param {Object} updates - 更新内容
   */
  async updateSong(songId, updates) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      console.log(`🔄 更新歌曲: ${songId}`);

      // 获取现有歌曲
      const existing = await this.collection.get({
        ids: [songId.toString()]
      });

      if (!existing || !existing.metadatas || existing.metadatas.length === 0) {
        console.log('⚠️ 歌曲不存在');
        return;
      }

      // 合并元数据
      const metadata = {
        ...existing.metadatas[0],
        ...updates
      };

      // 重新构建文档
      const doc = this.buildDocument({
        id: songId,
        ...metadata
      });

      // 更新
      await this.collection.update({
        ids: [songId.toString()],
        documents: [doc],
        metadatas: [metadata]
      });

      console.log(`✅ 歌曲更新成功`);
    } catch (error) {
      console.error('❌ 更新歌曲失败:', error.message);
    }
  }

  /**
   * 删除歌曲
   * @param {string} songId - 歌曲 ID
   */
  async deleteSong(songId) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      await this.collection.delete({
        ids: [songId.toString()]
      });
      console.log(`✅ 歌曲删除成功: ${songId}`);
    } catch (error) {
      console.error('❌ 删除歌曲失败:', error.message);
    }
  }

  /**
   * 清空集合
   */
  async clear() {
    if (!this.initialized) {
      await this.init();
    }

    try {
      console.log('🗑️ 清空 Chroma 集合...');
      await this.client.deleteCollection({ name: this.collectionName });

      // 重新创建集合
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: { description: '音乐库向量存储' }
      });

      console.log('✅ Chroma 集合已清空');
    } catch (error) {
      console.error('❌ 清空集合失败:', error.message);
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const count = await this.collection.count();
      return {
        totalSongs: count,
        collectionName: this.collectionName
      };
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error.message);
      return {
        totalSongs: 0,
        collectionName: this.collectionName
      };
    }
  }
}

export default ChromaMusicStore;
