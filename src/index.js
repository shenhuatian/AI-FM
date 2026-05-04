// 主服务器入口 - 四层架构整合
import express from 'express';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// 第一层：外部上下文
import { NeteaseCloudMusic } from './music/ncm.js';
import { WeatherService } from './services/weather.js';
import { FeishuCalendarService } from './services/feishu.js';

// 第二层：本地大脑
import { DeepSeekAdapter } from './brain/deepseek.js';
import { LangChainAdapter } from './brain/langchain-adapter.js';
import { StateManager } from './brain/state.js';
import { Router } from './brain/router.js';
import { ContextBuilder } from './brain/context.js';
import { XiaomiTTSService } from './brain/tts-xiaomi.js';
import { Scheduler } from './brain/scheduler.js';
import { ProactiveAgent } from './brain/proactive.js';
import musicVectorStore from './brain/music-vector-store.js';
import { RecommendationStrategy } from './brain/recommendation-strategy.js';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// 初始化外部服务
const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);
const weatherService = process.env.OPENWEATHER_API_KEY
  ? new WeatherService(process.env.OPENWEATHER_API_KEY)
  : null;
const calendarService = process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET
  ? new FeishuCalendarService(process.env.FEISHU_APP_ID, process.env.FEISHU_APP_SECRET)
  : null;

// 初始化本地大脑
const state = new StateManager();
const deepseek = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY, state);
const langchain = new LangChainAdapter(process.env.DEEPSEEK_API_KEY, state);
const router = new Router(langchain, ncm);  // 使用 LangChain 替代 DeepSeek
const contextBuilder = new ContextBuilder(state, weatherService, calendarService);
const tts = new XiaomiTTSService(process.env.XIAOMI_API_KEY);
const scheduler = new Scheduler(deepseek, ncm, state);
const proactiveAgent = new ProactiveAgent(deepseek, state, contextBuilder, ncm);
const recommendationStrategy = new RecommendationStrategy(ncm, state);

// 🔥 缓存前端配置创建的 LangChainAdapter 实例（避免每次请求都创建新实例）
const langChainCache = new Map();

// 异步初始化状态管理器
await state.init();

// 初始化音乐向量存储
console.log('🎵 初始化音乐向量存储...');
await musicVectorStore.initialize();
console.log('✅ 音乐向量存储初始化完成');

// 测试 TTS 服务可用性
console.log('🎤 后台测试 TTS 服务...');
tts.testAvailability().then(available => {
  if (available) {
    console.log('✅ TTS 服务已就绪');
  }
}).catch(error => {
  console.error('TTS 测试出错:', error);
});

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use('/cache', express.static('cache'));

// ==================== API 路由 ====================

/**
 * POST /api/chat - 与DJ对话
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, mood, config } = req.body;

    // 🔥 修改配置优先级：后端优先，前端作为临时覆盖
    const deepseekKey = process.env.DEEPSEEK_API_KEY || config?.deepseekKey;
    const ncmCookie = process.env.NCM_COOKIE || config?.ncmCookie;

    // 如果没有配置，返回错误
    if (!deepseekKey) {
      return res.status(400).json({
        error: '未配置 DeepSeek API Key',
        needConfig: true
      });
    }

    // 🔥 使用缓存的 LangChainAdapter 实例（避免每次请求都创建新实例，保持对话历史）
    let activeLangChain;
    if (config?.deepseekKey && !process.env.DEEPSEEK_API_KEY) {
      // 只有在后端没有配置时，才使用前端配置
      const cacheKey = config.deepseekKey;
      if (!langChainCache.has(cacheKey)) {
        console.log('🆕 创建新的 LangChainAdapter 实例（前端配置）');
        langChainCache.set(cacheKey, new LangChainAdapter(deepseekKey, state));
      }
      activeLangChain = langChainCache.get(cacheKey);
    } else {
      // 使用后端默认实例
      activeLangChain = langchain;
    }

    const activeNcm = config?.ncmCookie && !process.env.NCM_COOKIE
      ? new NeteaseCloudMusic(ncmCookie)
      : ncm;

    // 构建上下文
    const context = await contextBuilder.build({
      userInput: message,
      mood: mood
    });

    // 🔥 使用 LangChain 直接处理（不再需要传递对话历史，LangChain 自动管理）
    const result = await activeLangChain.decide(context);

    // 保存对话
    await state.addMessage('user', message);
    await state.addMessage('assistant', result.say);

    // 搜索歌曲并去重（使用歌曲名称去重，避免同一首歌的不同版本）
    const songs = [];
    const seenSongNames = new Set(); // 用于去重（使用歌曲名称）

    if (result.play && result.play.length > 0) {
      console.log('🎵 开始搜索歌曲，AI 返回的歌曲列表:', result.play);

      for (const playItem of result.play) {
        try {
          // 检查格式是否正确
          if (!playItem || typeof playItem !== 'string') {
            console.log(`⚠️ 跳过无效的歌曲项: ${playItem}`);
            continue;
          }

          // 分割歌曲名和艺术家
          const parts = playItem.split(' - ');
          if (parts.length < 2) {
            console.log(`⚠️ 歌曲格式不正确（缺少 " - "）: ${playItem}`);
            // 尝试直接搜索
            const song = await activeNcm.findSong(playItem.trim(), '');
            if (song) {
              const normalizedName = song.name.toLowerCase().trim();
              if (!seenSongNames.has(normalizedName)) {
                songs.push(song);
                seenSongNames.add(normalizedName);
                await state.addPlay(song, { reason: result.reason });
                console.log(`✅ 添加歌曲: ${song.name} - ${song.artist}`);
              }
            }
            continue;
          }

          const songName = parts[0].trim();
          const artistName = parts[1].trim();

          if (!songName) {
            console.log(`⚠️ 歌曲名为空: ${playItem}`);
            continue;
          }

          console.log(`🔍 搜索: ${songName} - ${artistName}`);
          const song = await activeNcm.findSong(songName, artistName);

          if (song) {
            // 使用歌曲名称去重（忽略大小写）
            const normalizedName = song.name.toLowerCase().trim();

            if (!seenSongNames.has(normalizedName)) {
              songs.push(song);
              seenSongNames.add(normalizedName);
              await state.addPlay(song, { reason: result.reason });
              console.log(`✅ 添加歌曲: ${song.name} - ${song.artist}`);
            } else {
              console.log(`⚠️ 跳过重复歌曲: ${song.name} - ${song.artist} (歌曲名称重复)`);
            }
          } else {
            console.log(`❌ 未找到歌曲: ${songName} - ${artistName}`);
          }
        } catch (error) {
          console.error(`❌ 搜索歌曲失败: ${playItem}`, error.message);
        }
      }

      console.log(`🎵 搜索完成，找到 ${songs.length} 首歌曲`);

      // 🔥 新功能：如果找到的歌曲少于 AI 推荐的数量，使用推荐策略补充
      const targetCount = result.play.length;
      if (songs.length < targetCount && songs.length > 0) {
        console.log(`\n🎯 歌曲数量不足 (${songs.length}/${targetCount})，启动智能推荐补充...`);

        try {
          // 使用第一首成功找到的歌曲作为种子
          const seedSong = songs[0];
          console.log(`   种子歌曲: ${seedSong.name} - ${seedSong.artist}`);

          // 获取相似歌曲推荐
          const similarSongs = await activeNcm.getSimilarSongs(seedSong.id, targetCount - songs.length + 3);

          // 过滤并添加相似歌曲
          for (const similarSong of similarSongs) {
            if (songs.length >= targetCount) break;

            const normalizedName = similarSong.name.toLowerCase().trim();
            if (!seenSongNames.has(normalizedName)) {
              // 获取播放 URL
              similarSong.url = await activeNcm.getSongUrl(similarSong.id, 'standard');

              if (similarSong.url) {
                songs.push(similarSong);
                seenSongNames.add(normalizedName);
                await state.addPlay(similarSong, { reason: `相似推荐（基于 ${seedSong.name}）` });
                console.log(`✅ 添加相似歌曲: ${similarSong.name} - ${similarSong.artist}`);
              }
            }
          }

          console.log(`✅ 智能推荐补充完成，当前歌曲数: ${songs.length}`);
        } catch (error) {
          console.error(`❌ 智能推荐补充失败:`, error.message);
        }
      }
    }

    // 获取 TTS 配置
    const ttsSettings = state.getTTSSettings();
    const shouldGenerateTTS = result.say && tts.isAvailable && ttsSettings.enabled && ttsSettings.mode !== 'quiet';

    // 🔥 立即返回响应，不等待 TTS 生成
    res.json({
      say: result.say,
      audioUrl: null,
      songs: songs,
      reason: result.reason,
      type: result.type,
      ttsEnabled: tts.isAvailable,
      ttsSettings: ttsSettings  // 返回 TTS 配置给前端
    });

    // 🔥 异步生成 TTS（不阻塞响应）
    if (shouldGenerateTTS) {
      tts.synthesize(result.say, { voice: ttsSettings.voice }).then(audioPath => {
        if (audioPath) {
          const audioUrl = `/cache/tts/${path.basename(audioPath)}`;
          console.log('✅ TTS 生成完成，推送给前端:', audioUrl);

          const message = JSON.stringify({
            type: 'tts',
            audioUrl: audioUrl,
            text: result.say,
            mode: ttsSettings.mode  // 告诉前端使用哪种模式
          });

          clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(message);
            }
          });
        }
      }).catch(error => {
        console.error('❌ 后台 TTS 生成失败:', error);
      });
    }
  } catch (error) {
    console.error('处理对话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/now - 获取当前播放信息
 */
app.get('/api/now', async (req, res) => {
  try {
    const history = state.getPlayHistory(1);
    const current = history[0] || null;

    res.json({
      current: current,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取当前播放失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/next - 获取下一首推荐
 */
app.get('/api/next', async (req, res) => {
  try {
    const context = await contextBuilder.build();
    const decision = await deepseek.decide(context);

    // 搜索第一首歌
    if (decision.play.length > 0) {
      const [songName, artistName] = decision.play[0].split(' - ').map(s => s.trim());
      const song = await ncm.findSong(songName, artistName);

      if (song) {
        await state.addPlay(song, { reason: decision.reason });

        res.json({
          say: decision.say,
          song: song,
          reason: decision.reason
        });
        return;
      }
    }

    res.json({
      say: decision.say,
      song: null,
      reason: decision.reason
    });
  } catch (error) {
    console.error('获取下一首失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/taste - 获取用户品味信息
 */
app.get('/api/taste', async (req, res) => {
  try {
    const recentSongs = state.getRecentSongs(20);
    res.json({
      recentSongs: recentSongs
    });
  } catch (error) {
    console.error('获取品味信息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plan/today - 获取今日计划
 */
app.get('/api/plan/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const plan = state.getPlan(today);

    res.json({
      date: today,
      plan: plan
    });
  } catch (error) {
    console.error('获取今日计划失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate-poem - 生成诗歌
 */
app.post('/api/generate-poem', async (req, res) => {
  try {
    const { songName, artist } = req.body;

    // 使用DeepSeek生成诗歌
    const prompt = `请为歌曲《${songName}》（演唱者：${artist}）创作一首简短的诗歌，4行以内，表达这首歌的意境和情感。`;

    try {
      const poem = await deepseek.chat([
        { role: 'user', content: prompt }
      ]);

      res.json({ poem: poem });
    } catch (error) {
      // 如果AI生成失败，返回默认诗歌
      const defaultPoem = `听${songName}\n感受${artist}的情感\n每个音符都是一个故事\n每段旋律都是一次旅行`;
      res.json({ poem: defaultPoem });
    }
  } catch (error) {
    console.error('生成诗歌失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/like - 收藏歌曲
 */
app.post('/api/like', async (req, res) => {
  try {
    const { songId, songName, artist } = req.body;
    // 这里可以添加收藏逻辑，暂时只返回成功
    console.log(`❤️ 收藏歌曲: ${songName} - ${artist}`);
    res.json({ success: true });
  } catch (error) {
    console.error('收藏失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/context - 获取当前上下文信息（调试用）
 */
app.get('/api/context', async (req, res) => {
  try {
    const context = await contextBuilder.build();
    res.json(context);
  } catch (error) {
    console.error('获取上下文失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 反馈和收藏 API ====================

/**
 * POST /api/feedback - 保存用户反馈
 */
app.post('/api/feedback', async (req, res) => {
  try {
    const { songId, songName, artist, feedback } = req.body;

    if (!songId || !feedback) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (feedback !== 'like' && feedback !== 'dislike') {
      return res.status(400).json({ error: '反馈类型必须是 like 或 dislike' });
    }

    await state.addFeedback(songId, songName, artist, feedback);

    res.json({ success: true });
  } catch (error) {
    console.error('保存反馈失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/feedback/:songId - 删除反馈
 */
app.delete('/api/feedback/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    await state.removeFeedback(songId);
    res.json({ success: true });
  } catch (error) {
    console.error('删除反馈失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/feedback - 获取所有反馈
 */
app.get('/api/feedback', async (req, res) => {
  try {
    const feedback = state.getAllFeedback();
    res.json({ feedback });
  } catch (error) {
    console.error('获取反馈失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/feedback/liked - 获取喜欢的歌曲
 */
app.get('/api/feedback/liked', async (req, res) => {
  try {
    const liked = state.getLikedSongs();
    res.json({ liked });
  } catch (error) {
    console.error('获取喜欢的歌曲失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/feedback/disliked - 获取不喜欢的歌曲
 */
app.get('/api/feedback/disliked', async (req, res) => {
  try {
    const disliked = state.getDislikedSongs();
    res.json({ disliked });
  } catch (error) {
    console.error('获取不喜欢的歌曲失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/favorite - 添加收藏
 */
app.post('/api/favorite', async (req, res) => {
  try {
    const { song } = req.body;

    if (!song || !song.id) {
      return res.status(400).json({ error: '缺少歌曲信息' });
    }

    const success = await state.addFavorite(song);

    res.json({ success });
  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/favorite/:songId - 删除收藏
 */
app.delete('/api/favorite/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    await state.removeFavorite(songId);
    res.json({ success: true });
  } catch (error) {
    console.error('删除收藏失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/favorites - 获取所有收藏
 */
app.get('/api/favorites', async (req, res) => {
  try {
    const favorites = state.getFavorites();
    res.json({ favorites });
  } catch (error) {
    console.error('获取收藏失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/favorites - 清空收藏夹
 */
app.delete('/api/favorites', async (req, res) => {
  try {
    await state.clearFavorites();
    res.json({ success: true });
  } catch (error) {
    console.error('清空收藏夹失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 配置验证 API ====================

/**
 * POST /api/config/validate - 验证配置
 */
app.post('/api/config/validate', async (req, res) => {
  try {
    const { type, key, cookie } = req.body;
    console.log('🟡 /api/config/validate called, type:', type, 'key:', key ? key.substring(0, 10) + '...' : 'empty');

    if (type === 'deepseek') {
      // 验证 DeepSeek API Key
      try {
        const testDeepseek = new DeepSeekAdapter(key, state);
        const testResult = await testDeepseek.chat([
          { role: 'user', content: 'Hello' }
        ]);

        if (testResult) {
          res.json({ valid: true, message: '连接成功' });
        } else {
          res.json({ valid: false, message: 'API Key 无效' });
        }
      } catch (error) {
        res.json({ valid: false, message: error.message });
      }
    } else if (type === 'ncm') {
      // 验证网易云 Cookie
      try {
        const testNcm = new NeteaseCloudMusic(cookie);
        const loginStatus = await fetch('http://localhost:3000/login/status?cookie=' + encodeURIComponent(cookie));
        const data = await loginStatus.json();

        if (data.data && data.data.account) {
          const isVIP = data.data.account.vipType === 11;
          res.json({
            valid: true,
            message: isVIP ? 'VIP会员' : '普通用户',
            nickname: data.data.profile?.nickname || '未知用户',
            isVIP: isVIP
          });
        } else {
          res.json({ valid: false, message: 'Cookie 无效或已过期' });
        }
      } catch (error) {
        res.json({ valid: false, message: error.message });
      }
    } else {
      res.status(400).json({ error: '不支持的验证类型' });
    }
  } catch (error) {
    console.error('验证配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/config/test-backend - 测试后端 .env 配置
 */
app.post('/api/config/test-backend', async (req, res) => {
  try {
    const { type } = req.body;
    console.log('🔵 /api/config/test-backend called, type:', type);

    if (type === 'deepseek') {
      // 重新加载 .env 确保使用最新配置
      dotenv.config();

      // 测试后端 DeepSeek API Key
      if (!process.env.DEEPSEEK_API_KEY) {
        return res.json({ valid: false, message: '后端未配置 DeepSeek API Key' });
      }

      try {
        // 每次测试都创建新实例，确保使用最新的 API Key
        const testAdapter = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY, state);
        const testResult = await testAdapter.chat([
          { role: 'user', content: 'Hello' }
        ]);

        if (testResult) {
          res.json({ valid: true, message: '连接成功' });
        } else {
          res.json({ valid: false, message: 'API Key 无效' });
        }
      } catch (error) {
        res.json({ valid: false, message: error.message });
      }
    } else if (type === 'ncm') {
      // 重新加载 .env 确保使用最新配置
      dotenv.config();

      // 测试后端网易云 Cookie
      if (!process.env.NCM_COOKIE) {
        return res.json({ valid: false, message: '后端未配置网易云 Cookie' });
      }

      try {
        const loginStatus = await fetch('http://localhost:3000/login/status?cookie=' + encodeURIComponent(process.env.NCM_COOKIE));
        const data = await loginStatus.json();

        if (data.data && data.data.account) {
          const isVIP = data.data.account.vipType === 11;
          res.json({
            valid: true,
            message: isVIP ? 'VIP会员' : '普通用户',
            nickname: data.data.profile?.nickname || '未知用户',
            isVIP: isVIP
          });
        } else {
          res.json({ valid: false, message: 'Cookie 无效或已过期' });
        }
      } catch (error) {
        res.json({ valid: false, message: error.message });
      }
    } else {
      res.status(400).json({ error: '不支持的验证类型' });
    }
  } catch (error) {
    console.error('测试后端配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 脱敏字符串（只显示前后几位）
 */
const maskString = (str, showLength = 4) => {
  if (!str || str.length <= showLength * 2) {
    return str;
  }
  const start = str.substring(0, showLength);
  const end = str.substring(str.length - showLength);
  const middle = '*'.repeat(Math.min(20, str.length - showLength * 2));
  return `${start}${middle}${end}`;
};

/**
 * POST /api/config/save-to-env - 保存配置到 .env 文件
 */
app.post('/api/config/save-to-env', async (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: '缺少配置数据' });
    }

    // 读取现有 .env 文件
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';

    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // 如果文件不存在，使用模板
      console.log('⚠️ .env 文件不存在，将创建新文件');
      envContent = await fs.readFile(path.join(__dirname, '../.env.example'), 'utf-8');
    }

    // 备份现有 .env 文件
    const backupPath = path.join(__dirname, '../.env.backup');
    await fs.writeFile(backupPath, envContent);
    console.log('✅ 已备份 .env 到 .env.backup');

    // 更新配置值
    const updateEnvValue = (content, key, value) => {
      if (!value) return content; // 如果值为空，不更新

      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        // 更新现有值
        return content.replace(regex, `${key}=${value}`);
      } else {
        // 添加新值
        return content + `\n${key}=${value}`;
      }
    };

    // 更新各个配置项
    if (config.deepseekKey) {
      envContent = updateEnvValue(envContent, 'DEEPSEEK_API_KEY', config.deepseekKey);
    }
    if (config.ncmCookie) {
      envContent = updateEnvValue(envContent, 'NCM_COOKIE', `"${config.ncmCookie}"`);
    }
    if (config.xiaomiKey) {
      envContent = updateEnvValue(envContent, 'XIAOMI_API_KEY', config.xiaomiKey);
    }
    if (config.xiaomiBaseUrl) {
      envContent = updateEnvValue(envContent, 'XIAOMI_BASE_URL', config.xiaomiBaseUrl);
    }
    if (config.openweatherKey) {
      envContent = updateEnvValue(envContent, 'OPENWEATHER_API_KEY', config.openweatherKey);
    }
    if (config.feishuAppId) {
      envContent = updateEnvValue(envContent, 'FEISHU_APP_ID', config.feishuAppId);
    }
    if (config.feishuAppSecret) {
      envContent = updateEnvValue(envContent, 'FEISHU_APP_SECRET', config.feishuAppSecret);
    }

    // 写入 .env 文件
    await fs.writeFile(envPath, envContent);
    console.log('✅ 配置已保存到 .env 文件');

    // 重新加载环境变量
    dotenv.config();

    res.json({
      success: true,
      message: '配置已保存，请重启服务以使配置生效',
      needRestart: true
    });
  } catch (error) {
    console.error('保存配置到 .env 失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/config/status - 获取配置状态（只返回配置状态，不返回实际值）
 */
app.get('/api/config/status', async (req, res) => {
  try {
    // 重新加载 .env 确保状态反映最新配置
    dotenv.config();
    res.json({
      deepseek: {
        configured: !!process.env.DEEPSEEK_API_KEY,
        maskedValue: process.env.DEEPSEEK_API_KEY ? maskString(process.env.DEEPSEEK_API_KEY) : null,
        source: 'backend'
      },
      ncm: {
        configured: !!process.env.NCM_COOKIE,
        maskedValue: process.env.NCM_COOKIE ? maskString(process.env.NCM_COOKIE, 20) : null,
        source: 'backend'
      },
      xiaomi: {
        configured: !!process.env.XIAOMI_API_KEY,
        available: tts.isAvailable,
        maskedValue: process.env.XIAOMI_API_KEY ? maskString(process.env.XIAOMI_API_KEY) : null,
        source: 'backend'
      },
      openweather: {
        configured: !!process.env.OPENWEATHER_API_KEY,
        maskedValue: process.env.OPENWEATHER_API_KEY ? maskString(process.env.OPENWEATHER_API_KEY) : null,
        source: 'backend'
      },
      feishu: {
        configured: !!(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
        maskedAppId: process.env.FEISHU_APP_ID ? maskString(process.env.FEISHU_APP_ID) : null,
        maskedAppSecret: process.env.FEISHU_APP_SECRET ? maskString(process.env.FEISHU_APP_SECRET) : null,
        source: 'backend'
      }
    });
  } catch (error) {
    console.error('获取配置状态失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 主动对话 API ====================

/**
 * GET /api/proactive/settings - 获取主动对话设置
 */
app.get('/api/proactive/settings', async (req, res) => {
  try {
    const settings = state.getProactiveSettings();
    res.json({ settings });
  } catch (error) {
    console.error('获取主动对话设置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/proactive/settings - 更新主动对话设置
 */
app.post('/api/proactive/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    await state.updateProactiveSettings(settings);

    // 如果设置改变，重启主动对话系统
    if (settings.level === 'quiet') {
      proactiveAgent.stop();
    } else if (!proactiveAgent.isRunning) {
      proactiveAgent.start();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('更新主动对话设置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/proactive/history - 获取主动消息历史
 */
app.get('/api/proactive/history', async (req, res) => {
  try {
    const history = state.getProactiveMessages(20);
    res.json({ history });
  } catch (error) {
    console.error('获取主动消息历史失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TTS 配置 API ====================

/**
 * GET /api/tts/config - 获取 TTS 配置
 */
app.get('/api/tts/config', async (req, res) => {
  try {
    const settings = state.getTTSSettings();
    res.json({ settings, available: tts.isAvailable });
  } catch (error) {
    console.error('获取 TTS 配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tts/config - 更新 TTS 配置
 */
app.post('/api/tts/config', async (req, res) => {
  try {
    const { settings } = req.body;

    // 验证配置
    if (settings.enabled !== undefined && typeof settings.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 必须是布尔值' });
    }

    if (settings.voice && !['冰糖', '茉莉', '苏打', '白桦', 'Mia', 'Chloe', 'Milo', 'Dean'].includes(settings.voice)) {
      return res.status(400).json({ error: '不支持的音色' });
    }

    if (settings.mode && !['dj', 'music', 'quiet'].includes(settings.mode)) {
      return res.status(400).json({ error: '不支持的模式' });
    }

    await state.updateTTSSettings(settings);

    res.json({ success: true, settings: state.getTTSSettings() });
  } catch (error) {
    console.error('更新 TTS 配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tts/test - 重新测试 TTS 服务可用性
 */
app.post('/api/tts/test', async (req, res) => {
  try {
    const available = await tts.testAvailability();
    res.json({ available, isAvailable: tts.isAvailable });
  } catch (error) {
    console.error('TTS 测试失败:', error);
    res.json({ available: false, isAvailable: false, error: error.message });
  }
});

// 启动HTTP服务器
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║      🎵 AI DJ 服务已启动 🎵           ║
╚════════════════════════════════════════╝

📡 访问地址: http://localhost:${PORT}
🧠 AI大脑: DeepSeek
🎼 音乐源: 网易云音乐
${weatherService ? '🌤️  天气服务: 已启用' : ''}
${calendarService ? '📅 日程服务: 已启用' : ''}
${process.env.XIAOMI_API_KEY ? '🎤 语音服务: 小米 MiMo TTS (已启用)' : ''}
🤖 主动对话: 已启用

🎧 准备好为你播放音乐了！
  `);

  // 启动调度器
  scheduler.start();

  // 启动主动对话系统（根据设置）
  const proactiveSettings = state.getProactiveSettings();
  if (proactiveSettings.level !== 'quiet') {
    proactiveAgent.start();
  }
});

// WebSocket服务器（用于实时推送）
const wss = new WebSocketServer({ server, path: '/stream' });

// 存储所有连接的客户端
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('✅ WebSocket客户端已连接');
  clients.add(ws);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 收到消息:', data);

      if (data.type === 'chat') {
        const context = await contextBuilder.build({
          userInput: data.message,
          mood: data.mood
        });

        // 🔥 使用 LangChainAdapter 而非 Router（保持对话历史一致性）
        const result = await langchain.decide(context);

        // 保存对话到状态管理器
        await state.addMessage('user', data.message);
        await state.addMessage('assistant', result.say);

        ws.send(JSON.stringify({
          type: 'response',
          data: {
            type: 'ai',
            ...result
          }
        }));

        // 标记用户响应了主动消息
        await state.markProactiveMessageResponded();
        proactiveAgent.recordUserResponse(true);
      }
    } catch (error) {
      console.error('处理WebSocket消息失败:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket客户端已断开');
    clients.delete(ws);
  });
});

// 主动对话推送函数
const broadcastProactiveMessage = async () => {
  const decision = await proactiveAgent.checkAndSpeak();

  if (decision && decision.shouldSpeak) {
    console.log('📢 广播主动消息:', decision.message);

    // 搜索歌曲（如果有推荐）
    const songs = [];
    if (decision.songs && decision.songs.length > 0) {
      for (const playItem of decision.songs) {
        const [songName, artistName] = playItem.split(' - ').map(s => s.trim());
        const song = await ncm.findSong(songName, artistName);
        if (song) {
          songs.push(song);
        }
      }
    }

    // 广播给所有连接的客户端
    const message = JSON.stringify({
      type: 'proactive',
      message: decision.message,
      songs: songs,
      reason: decision.reason,
      intent: decision.intent,
      timestamp: new Date().toISOString()
    });

    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
};

// 将广播函数传递给 ProactiveAgent
proactiveAgent.setBroadcastCallback(broadcastProactiveMessage);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  scheduler.stop();
  proactiveAgent.stop();
  server.close(() => {
    console.log('✅ 服务已关闭');
    process.exit(0);
  });
});
