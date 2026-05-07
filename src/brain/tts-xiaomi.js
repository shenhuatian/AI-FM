// TTS语音合成 - 小米 MiMo V2.5
// 基于官方文档：https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/speech-synthesis-v2.5
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class XiaomiTTSService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = process.env.XIAOMI_BASE_URL || 'https://token-plan-sgp.xiaomimimo.com';
    this.model = 'mimo-v2.5-tts'; // 使用 MiMo-V2.5-TTS 模型
    this.cacheDir = 'cache/tts';
    this.isAvailable = false;

    // 代理配置（从环境变量读取）
    this.proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
    this.agent = this.proxyUrl ? new HttpsProxyAgent(this.proxyUrl) : null;

    if (this.proxyUrl) {
      console.log('🌐 TTS 将使用代理:', this.proxyUrl);
    }

    this.ensureCacheDir();
  }

  /**
   * 测试 TTS 服务是否可用
   * @returns {Promise<boolean>} 是否可用
   */
  async testAvailability() {
    if (!this.apiKey) {
      console.log('⚠️  未配置 XIAOMI_API_KEY，TTS 功能已禁用');
      this.isAvailable = false;
      return false;
    }

    try {
      console.log('🧪 测试小米 MiMo TTS API...');
      const fetchOptions = {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'assistant',
              content: '测试'
            }
          ],
          audio: {
            format: 'mp3',
            voice: '冰糖' // 中文女声
          }
        }),
        signal: AbortSignal.timeout(15000) // 15秒超时
      };

      // 如果配置了代理，添加 agent
      if (this.agent) {
        fetchOptions.agent = this.agent;
      }

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, fetchOptions);

      if (response.ok) {
        console.log('✅ 小米 MiMo TTS 可用');
        this.isAvailable = true;
        return true;
      } else {
        const errorText = await response.text();
        console.log('❌ 小米 MiMo API 测试失败:', response.status, errorText);
        this.isAvailable = false;
        return false;
      }
    } catch (error) {
      console.log('❌ 小米 MiMo API 连接失败:', error.message);
      this.isAvailable = false;
      return false;
    }
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
   * @param {Object} options - 配置选项
   * @returns {string} 哈希值
   */
  getTextHash(text, options = {}) {
    const key = `${text}_${options.voice || '冰糖'}_${options.style || ''}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * 检查缓存是否存在
   * @param {string} text - 文本内容
   * @param {Object} options - 配置选项
   * @returns {Promise<string|null>} 缓存文件路径或null
   */
  async checkCache(text, options = {}) {
    const hash = this.getTextHash(text, options);
    const cachePath = path.join(this.cacheDir, `${hash}.mp3`);

    try {
      await fs.access(cachePath);
      return cachePath;
    } catch {
      return null;
    }
  }

  /**
   * 使用小米 MiMo 生成语音
   * @param {string} text - 要转换的文本
   * @param {Object} options - 配置选项
   * @param {string} options.voice - 音色 (冰糖, 茉莉, 苏打, 白桦, Mia, Chloe, Milo, Dean, mimo_default)
   * @param {string} options.style - 风格标签（如：开心、悲伤、东北话等）
   * @param {string} options.instruction - 自然语言指令（放在 user 消息中）
   * @returns {Promise<string>} 音频文件路径
   */
  async synthesize(text, options = {}) {
    // 检查 TTS 是否可用
    if (!this.isAvailable) {
      console.log('⚠️  TTS 服务不可用，跳过生成');
      return null;
    }

    // 检查缓存
    const cached = await this.checkCache(text, options);
    if (cached) {
      console.log('✅ 使用缓存的TTS音频');
      return cached;
    }

    if (!this.apiKey) {
      console.warn('⚠️ 未配置小米 API Key，跳过TTS生成');
      return null;
    }

    try {
      console.log('🎤 开始生成TTS音频...');

      // 处理文本：如果有风格标签，使用 (风格) 格式
      let finalText = text;
      if (options.style) {
        finalText = `(${options.style})${text}`;
      }

      // 构建消息
      const messages = [];

      // 如果有自然语言指令，添加到 user 消息
      if (options.instruction) {
        messages.push({
          role: 'user',
          content: options.instruction
        });
      }

      // 要合成的文本放在 assistant 消息中（根据文档要求）
      messages.push({
        role: 'assistant',
        content: finalText
      });

      // 使用AbortController实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const fetchOptions = {
          method: 'POST',
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: messages,
            audio: {
              format: 'mp3',
              voice: options.voice || '冰糖' // 默认中文女声
            }
          }),
          signal: controller.signal
        };

        // 如果配置了代理，添加 agent
        if (this.agent) {
          fetchOptions.agent = this.agent;
        }

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, fetchOptions);

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`小米 API错误: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // 从响应中提取音频数据
        const message = result.choices[0].message;
        if (!message.audio || !message.audio.data) {
          throw new Error('响应中没有音频数据');
        }

        // 解码 Base64 音频数据
        const audioBase64 = message.audio.data;
        const audioBuffer = Buffer.from(audioBase64, 'base64');

        // 保存音频文件
        const hash = this.getTextHash(text, options);
        const outputPath = path.join(this.cacheDir, `${hash}.mp3`);
        await fs.writeFile(outputPath, audioBuffer);

        console.log('✅ TTS音频生成成功');
        return outputPath;
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          console.error('❌ TTS请求超时（30秒）');
        } else {
          throw fetchError;
        }
        return null;
      }
    } catch (error) {
      console.error('❌ TTS生成失败:', error.message);
      return null;
    }
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
          console.log('🧹 删除过期缓存:', file);
        }
      }
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }
}

export default XiaomiTTSService;
