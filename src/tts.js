// TTS语音合成 - Fish Audio
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class TTSService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cacheDir = 'cache/tts';
    this.ensureCacheDir();
  }

  /**
   * 确保缓存目录存在
   */
  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('创建缓存目录失败:', error);
    }
  }

  /**
   * 生成文本的哈希值（用于缓存）
   * @param {string} text - 文本内容
   * @returns {string} 哈希值
   */
  getTextHash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * 检查缓存是否存在
   * @param {string} text - 文本内容
   * @returns {Promise<string|null>} 缓存文件路径或null
   */
  async checkCache(text) {
    const hash = this.getTextHash(text);
    const cachePath = path.join(this.cacheDir, `${hash}.mp3`);

    try {
      await fs.access(cachePath);
      return cachePath;
    } catch {
      return null;
    }
  }

  /**
   * 使用Fish Audio生成语音
   * @param {string} text - 要转换的文本
   * @param {Object} options - 配置选项
   * @returns {Promise<string>} 音频文件路径
   */
  async synthesize(text, options = {}) {
    // 检查缓存
    const cached = await this.checkCache(text);
    if (cached) {
      console.log('使用缓存的TTS音频:', cached);
      return cached;
    }

    if (!this.apiKey) {
      console.warn('未配置Fish API Key，跳过TTS生成');
      return null;
    }

    try {
      const response = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          reference_id: options.voiceId || 'default',
          format: 'mp3',
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Fish API错误: ${response.status} ${response.statusText}`);
      }

      // 保存音频文件
      const hash = this.getTextHash(text);
      const outputPath = path.join(this.cacheDir, `${hash}.mp3`);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(buffer));

      console.log('TTS音频生成成功:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('TTS生成失败:', error);
      return null;
    }
  }

  /**
   * 批量生成语音
   * @param {Array<string>} texts - 文本数组
   * @param {Object} options - 配置选项
   * @returns {Promise<Array<string>>} 音频文件路径数组
   */
  async synthesizeBatch(texts, options = {}) {
    const results = [];
    for (const text of texts) {
      const audioPath = await this.synthesize(text, options);
      results.push(audioPath);
    }
    return results;
  }

  /**
   * 清理过期缓存
   * @param {number} maxAge - 最大缓存时间（毫秒）
   */
  async cleanCache(maxAge = 7 * 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          console.log('删除过期缓存:', filePath);
        }
      }
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }
}

export default TTSService;
