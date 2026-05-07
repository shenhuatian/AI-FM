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
import { SpotifyService } from './services/spotify.js';  // 🔥 Spotify API
import musicLibrary from './music/music-library.js';

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
import { UserProfile } from './brain/user-profile.js';  // 🔥 用户画像系统

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

// 🔥 初始化 Spotify 服务
const spotifyService = process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
  ? new SpotifyService(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET)
  : null;

// 初始化本地大脑
const state = new StateManager();
const deepseek = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY, state);
const langchain = new LangChainAdapter(process.env.DEEPSEEK_API_KEY, state);
const userProfile = new UserProfile(state);  // 🔥 初始化用户画像
const router = new Router(deepseek, ncm, userProfile);  // 🔥 传入 userProfile
const contextBuilder = new ContextBuilder(state, weatherService, calendarService);
const tts = new XiaomiTTSService(process.env.XIAOMI_API_KEY);
const scheduler = new Scheduler(deepseek, ncm, state);
const proactiveAgent = new ProactiveAgent(deepseek, state, contextBuilder, ncm);

// 🔥 传入 Spotify 服务
const recommendationStrategy = new RecommendationStrategy(ncm, state, spotifyService);

// 🔥 缓存前端配置创建的 LangChainAdapter 实例
const langChainCache = new Map();

// 异步初始化状态管理器
await state.init();

// 🔥 初始化用户画像
console.log('👤 初始化用户画像...');
await userProfile.init();
console.log('✅ 用户画像初始化完成');

// 初始化音乐库
console.log('📚 初始化音乐库...');
await musicLibrary.init();
console.log('✅ 音乐库初始化完成');

// 初始化音乐向量存储
console.log('🎵 初始化音乐向量存储...');
await musicVectorStore.initialize();
console.log('✅ 音乐向量存储初始化完成');

// 🔥 测试 Spotify 服务
if (spotifyService) {
  console.log('🎵 测试 Spotify 服务...');
  try {
    await spotifyService.getAccessToken();
    console.log('✅ Spotify 服务已就绪');
    console.log('💡 现在可以使用音频特征增强推荐！');
  } catch (error) {
    console.error('❌ Spotify 服务初始化失败:', error.message);
    console.log('⚠️ 推荐功能将不使用音频特征');
  }
} else {
  console.log('⚠️ 未配置 Spotify API，推荐功能将不使用音频特征');
}

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

    // 创建 DeepSeek 实例
    const activeDeepseek = config?.deepseekKey && !process.env.DEEPSEEK_API_KEY
      ? new DeepSeekAdapter(deepseekKey, state)
      : deepseek;

    const activeNcm = config?.ncmCookie && !process.env.NCM_COOKIE
      ? new NeteaseCloudMusic(ncmCookie)
      : ncm;

    // 🔥 创建推荐策略实例（使用正确的 NCM 实例）
    const activeRecommendationStrategy = config?.ncmCookie && !process.env.NCM_COOKIE
      ? new RecommendationStrategy(activeNcm, state, spotifyService)
      : recommendationStrategy;

    // 保存用户消息
    await state.addMessage('user', message);

    // 🔥 【阶段0】检查是否是对反问的回复
    const recentMessages = state.getMessages(5);
    const lastAssistantMessage = recentMessages.reverse().find(m => m.role === 'assistant');

    // 简单检测：如果最近的助手消息包含"版本"、"想听谁的"等关键词，可能是反问
    if (lastAssistantMessage &&
        (lastAssistantMessage.content.includes('版本') ||
         lastAssistantMessage.content.includes('想听谁的') ||
         lastAssistantMessage.content.includes('随机') ||
         lastAssistantMessage.content.includes('全部播放'))) {

      console.log(`\n🎯 ========== 阶段0: 处理反问回复 ==========`);
      console.log(`   用户回复: ${message}`);

      // 检测用户选择
      let selectedArtist = null;
      let playMode = null;

      if (message.includes('随机')) {
        playMode = 'random';
        console.log(`   选择: 随机播放`);
      } else if (message.includes('全部') || message.includes('都')) {
        playMode = 'all';
        console.log(`   选择: 全部播放`);
      } else {
        // 尝试提取艺术家名
        selectedArtist = message.trim();
        console.log(`   选择艺术家: ${selectedArtist}`);
      }

      // 从对话历史中提取歌曲名（简单实现：查找最近提到的歌曲）
      // 这里需要更复杂的逻辑来存储反问的上下文，暂时先用简单方式
      // TODO: 后续可以在 state 中存储 pendingClarification 状态

      console.log(`⚠️ 反问回复处理功能需要前端配合，暂时按正常流程处理`);
    }

    // 🔥 【阶段1】DeepSeek 意图分析
    console.log(`\n🎯 ========== 阶段1: 意图分析 ==========`);
    const conversationHistory = state.getMessages(10);
    const intent = await activeDeepseek.analyzeIntent(message, conversationHistory);
    console.log(`✅ 意图分析完成:`, intent);

    // 如果是纯聊天意图，不推荐音乐
    if (intent.intent === 'chat') {
      console.log(`💬 纯聊天模式，不推荐音乐`);

      // 使用 LangChain 生成回复
      const context = await contextBuilder.build({
        userInput: message,
        mood: mood,
        chatOnly: true
      });

      const result = await langchain.decide(context);
      await state.addMessage('assistant', result.say);

      return res.json({
        say: result.say,
        audioUrl: null,
        songs: [],
        reason: '',
        type: 'chat',
        ttsEnabled: tts.isAvailable,
        ttsSettings: state.getTTSSettings()
      });
    }

    // 🔥 【阶段1.5】检测同名歌曲（如果用户指定了具体歌曲）
    if (intent.song && !intent.artist && intent.confidence < 0.7) {
      console.log(`\n🎯 ========== 阶段1.5: 检测同名歌曲 ==========`);
      console.log(`   歌曲: ${intent.song}, 置信度: ${intent.confidence}`);

      const duplicates = await activeNcm.detectDuplicateSongs(intent.song);

      if (duplicates.length > 1) {
        console.log(`✅ 检测到 ${duplicates.length} 个不同艺术家的版本，触发反问`);

        // 生成反问
        const askResult = await activeDeepseek.generateAskForClarification(intent.song, duplicates);

        // 保存消息
        await state.addMessage('user', message);
        await state.addMessage('assistant', askResult.message);

        return res.json({
          say: askResult.message,
          audioUrl: null,
          songs: [],
          reason: '',
          type: 'ask_clarification',
          askData: askResult,
          ttsEnabled: tts.isAvailable,
          ttsSettings: state.getTTSSettings()
        });
      } else {
        console.log(`✅ 只有一个版本或没有找到，继续正常流程`);
      }
    }

    // 🔥 【阶段2】推荐策略执行
    console.log(`\n🎯 ========== 阶段2: 推荐策略执行 ==========`);
    const recommendedSongs = await activeRecommendationStrategy.hybridRecommend(intent, intent.count);
    console.log(`✅ 推荐策略完成: ${recommendedSongs.length} 首歌曲`);

    // 🔥 【阶段3】获取播放 URL 并过滤
    console.log(`\n🎯 ========== 阶段3: 获取播放链接 ==========`);
    const songs = [];
    const replacements = [];
    const seenSongNames = new Set();

    for (const song of recommendedSongs) {
      try {
        // 获取播放 URL
        song.url = await activeNcm.getSongUrl(song.id, 'standard');

        if (song.url) {
          const normalizedName = song.name.toLowerCase().trim();
          if (!seenSongNames.has(normalizedName)) {
            songs.push(song);
            seenSongNames.add(normalizedName);
            await state.addPlay(song, { reason: intent.mood || intent.keywords.join(', ') || '推荐' });

            if (song.isReplacement) {
              replacements.push({
                original: song.originalName,
                replacement: song.name
              });
            }
          }
        } else {
          console.log(`⚠️ 无法获取播放链接: ${song.name}`);
        }
      } catch (error) {
        console.error(`❌ 获取播放链接失败: ${song.name}`, error.message);
      }
    }

    console.log(`✅ 最终歌曲数: ${songs.length} 首`);

    // 🔥 【阶段3.5】AI验证搜索结果（仅当用户指定了具体歌曲时）
    if (intent.song && songs.length > 0) {
      console.log(`\n🎯 ========== 阶段3.5: AI验证搜索结果 ==========`);

      const userProfileData = userProfile ? userProfile.getProfile() : null;
      const verification = await activeDeepseek.verifySongMatch(intent, songs, userProfileData);

      console.log(`   验证结果: ${verification.match ? '✅ 匹配' : '❌ 不匹配'}`);
      console.log(`   原因: ${verification.reason}`);

      // 如果不匹配，尝试重新搜索（最多3次）
      if (!verification.match && verification.suggestion) {
        console.log(`⚠️ 搜索结果不匹配，尝试重新搜索`);
        console.log(`   建议: ${verification.suggestion}`);

        let retryCount = 0;
        const maxRetries = 3;
        let retrySuccess = false;

        while (retryCount < maxRetries && !retrySuccess) {
          retryCount++;
          console.log(`\n🔄 第 ${retryCount} 次重试`);

          // 增强关键词
          let enhancedKeyword = intent.song;
          if (retryCount === 1 && intent.artist) {
            enhancedKeyword = `${intent.song} ${intent.artist}`;
          } else if (retryCount === 2 && intent.keywords.length > 0) {
            enhancedKeyword = `${intent.song} ${intent.keywords.join(' ')}`;
          } else if (retryCount === 3) {
            // 最后一次尝试：使用用户画像中的偏好艺术家
            if (userProfileData && userProfileData.longTerm.favoriteArtists.length > 0) {
              enhancedKeyword = `${intent.song} ${userProfileData.longTerm.favoriteArtists[0]}`;
            }
          }

          console.log(`   增强关键词: ${enhancedKeyword}`);

          // 重新搜索
          const retryResults = await activeNcm.search(enhancedKeyword, 5);

          if (retryResults.length > 0) {
            // 验证新结果
            const retryVerification = await activeDeepseek.verifySongMatch(intent, retryResults, userProfileData);

            if (retryVerification.match) {
              console.log(`✅ 重试成功！找到匹配的歌曲`);

              // 替换歌曲列表
              songs.length = 0;
              for (const song of retryResults.slice(0, intent.count)) {
                song.url = await activeNcm.getSongUrl(song.id, 'standard');
                if (song.url) {
                  songs.push(song);
                  await state.addPlay(song, { reason: '重试搜索' });
                }
              }

              retrySuccess = true;
              break;
            } else {
              console.log(`❌ 重试 ${retryCount} 仍不匹配: ${retryVerification.reason}`);
            }
          }
        }

        if (!retrySuccess) {
          console.log(`⚠️ 重试 ${maxRetries} 次后仍未找到匹配歌曲，使用原始结果`);
        }
      }
    }

    // 🔥 【阶段4】DeepSeek 生成自然回复
    console.log(`\n🎯 ========== 阶段4: 生成回复 ==========`);
    const reply = await activeDeepseek.generateReply(message, songs, intent);
    console.log(`✅ 回复生成完成:`, reply);

    // 🔥 【阶段5】从对话中学习用户偏好
    if (userProfile && intent.intent === 'music_request') {
      console.log(`\n📝 ========== 阶段5: 学习用户偏好 ==========`);
      userProfile.learnFromConversation(message, intent);
    }

    // 保存助手消息
    await state.addMessage('assistant', reply.say);

    // 🔥 修改 AI 回复（添加替换提示和用户上传提示）
    let finalSay = reply.say;

    // 添加替换提示
    if (replacements.length > 0) {
      const originalNames = replacements.map(r => `《${r.original}》`).join('、');
      finalSay += `\n\n💡 提示：${originalNames} 因版权问题，已为你推荐相似歌曲~`;
      console.log(`⚠️ 共替换 ${replacements.length} 首歌曲`);
    }

    // 添加用户上传提示
    const hasUserUpload = songs.some(s => s.isUserUpload);
    if (hasUserUpload) {
      const userUploadSongs = songs.filter(s => s.isUserUpload);
      const songNames = userUploadSongs.map(s => `《${s.name}》`).join('、');
      finalSay += `\n\n⚠️ 提示：${songNames} 可能是用户上传的翻唱版本，不是官方版本（可能因版权问题）。如果想听官方版本，可以试试其他歌曲哦~`;
      console.log(`⚠️ 检测到 ${userUploadSongs.length} 首用户上传版本，已添加提示`);
    }

    // 获取 TTS 配置
    const ttsSettings = state.getTTSSettings();
    const shouldGenerateTTS = finalSay && tts.isAvailable && ttsSettings.enabled && ttsSettings.mode !== 'quiet';

    // 🔥 立即返回响应，不等待 TTS 生成
    res.json({
      say: finalSay,
      audioUrl: null,
      songs: songs,
      reason: reply.reason,
      type: 'music',
      ttsEnabled: tts.isAvailable,
      ttsSettings: ttsSettings  // 返回 TTS 配置给前端
    });

    // 🔥 异步生成 TTS（不阻塞响应）
    if (shouldGenerateTTS) {
      tts.synthesize(finalSay, { voice: ttsSettings.voice }).then(audioPath => {
        if (audioPath) {
          const audioUrl = `/cache/tts/${path.basename(audioPath)}`;

          const message = JSON.stringify({
            type: 'tts',
            audioUrl: audioUrl,
            text: finalSay,
            mode: ttsSettings.mode  // 告诉前端使用哪种模式
          });

          clients.forEach((client, clientId) => {
            if (client.readyState === 1) {
              client.send(message);
            } else {
              // 清理无效连接
              clients.delete(clientId);
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
    res.json({ success: true });
  } catch (error) {
    console.error('收藏失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lyric/:id - 获取歌词
 */
app.get('/api/lyric/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.query;

    // 使用配置的 NCM 实例
    let activeNcm = ncm;
    if (config) {
      try {
        const parsedConfig = JSON.parse(config);
        if (parsedConfig.ncmCookie && !process.env.NCM_COOKIE) {
          activeNcm = new NeteaseCloudMusic(parsedConfig.ncmCookie);
        }
      } catch (error) {
        console.error('解析配置失败:', error);
      }
    }

    const lyric = await activeNcm.getLyric(id);

    res.json({ lyric });
  } catch (error) {
    console.error('获取歌词失败:', error);
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
      envContent = await fs.readFile(path.join(__dirname, '../.env.example'), 'utf-8');
    }

    // 备份现有 .env 文件
    const backupPath = path.join(__dirname, '../.env.backup');
    await fs.writeFile(backupPath, envContent);

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
 * POST /api/proactive/test - 测试推送主动消息（开发调试用）
 */
app.post('/api/proactive/test', async (req, res) => {
  try {
    const { message, songs, reason } = req.body;

    if (!message) {
      return res.status(400).json({ error: '缺少 message 参数' });
    }

    // 构造推送消息
    const wsMessage = JSON.stringify({
      type: 'proactive',
      message: message,
      songs: songs || [],
      reason: reason || '测试消息',
      intent: 'test',
      timestamp: new Date().toISOString()
    });

    // 广播给所有连接的客户端
    let sentCount = 0;
    clients.forEach((client, clientId) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(wsMessage);
        sentCount++;
      } else {
        // 清理无效连接
        clients.delete(clientId);
      }
    });

    res.json({
      success: true,
      message: '测试消息已推送',
      clientCount: sentCount,
      data: JSON.parse(wsMessage)
    });
  } catch (error) {
    console.error('推送测试消息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// ==================== 播放模式配置 API ====================

/**
 * GET /api/playmode/settings - 获取播放模式配置
 */
app.get('/api/playmode/settings', async (req, res) => {
  try {
    const settings = state.getPlayModeSettings();
    res.json({ settings });
  } catch (error) {
    console.error('获取播放模式配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/playmode/settings - 更新播放模式配置
 */
app.post('/api/playmode/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    // 验证配置
    if (settings.mode && !['manual', 'auto', 'loop'].includes(settings.mode)) {
      return res.status(400).json({ error: '不支持的播放模式' });
    }

    await state.updatePlayModeSettings(settings);

    res.json({ success: true, settings: state.getPlayModeSettings() });
  } catch (error) {
    console.error('更新播放模式配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auto-recommend - 自动推荐下一批歌曲（智能续播）
 */
app.post('/api/auto-recommend', async (req, res) => {
  try {
    const { lastSong, config } = req.body;

    // 获取配置
    const deepseekKey = process.env.DEEPSEEK_API_KEY || config?.deepseekKey;
    const ncmCookie = process.env.NCM_COOKIE || config?.ncmCookie;

    if (!deepseekKey) {
      return res.status(400).json({
        error: '未配置 DeepSeek API Key',
        needConfig: true
      });
    }

    // 使用缓存的 LangChainAdapter 实例
    let activeLangChain;
    if (config?.deepseekKey && !process.env.DEEPSEEK_API_KEY) {
      const cacheKey = config.deepseekKey;
      if (!langChainCache.has(cacheKey)) {
        langChainCache.set(cacheKey, new LangChainAdapter(deepseekKey, state));
      }
      activeLangChain = langChainCache.get(cacheKey);
    } else {
      activeLangChain = langchain;
    }

    const activeNcm = config?.ncmCookie && !process.env.NCM_COOKIE
      ? new NeteaseCloudMusic(ncmCookie)
      : ncm;

    // 构建上下文
    const context = await contextBuilder.build({
      userInput: `刚播放完《${lastSong?.name || '未知'}》，继续推荐几首歌`,
      mood: 'auto-continue'
    });

    // 使用 LangChain 推荐
    const result = await activeLangChain.decide(context);

    // 搜索歌曲
    const songs = [];
    const seenSongNames = new Set();

    if (result.play && result.play.length > 0) {
      for (const playItem of result.play) {
        try {
          if (!playItem || typeof playItem !== 'string') continue;

          const parts = playItem.split(' - ');
          if (parts.length < 2) {
            const song = await activeNcm.findSong(playItem.trim(), '');
            if (song) {
              const normalizedName = song.name.toLowerCase().trim();
              if (!seenSongNames.has(normalizedName)) {
                songs.push(song);
                seenSongNames.add(normalizedName);
                await state.addPlay(song, { reason: '智能续播' });
              }
            }
            continue;
          }

          const songName = parts[0].trim();
          const artistName = parts[1].trim();

          if (!songName) continue;

          const song = await activeNcm.findSong(songName, artistName);

          if (song) {
            const normalizedName = song.name.toLowerCase().trim();
            if (!seenSongNames.has(normalizedName)) {
              songs.push(song);
              seenSongNames.add(normalizedName);
              await state.addPlay(song, { reason: '智能续播' });
            }
          }
        } catch (error) {
          console.error(`❌ 搜索歌曲失败: ${playItem}`, error.message);
        }
      }
    }

    res.json({
      say: result.say,
      songs: songs,
      reason: result.reason || '智能续播'
    });
  } catch (error) {
    console.error('自动推荐失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 音乐库导入 API ====================

/**
 * POST /api/music/import - 导入音乐库
 */
app.post('/api/music/import', async (req, res) => {
  try {
    const { mode } = req.body; // mode: 'full' 或 'incremental'

    // 1. 获取用户账号信息
    const userAccount = await ncm.getUserAccount();
    if (!userAccount) {
      return res.status(400).json({ error: '无法获取用户信息，请检查 Cookie 是否有效' });
    }

    // 2. 获取用户数据
    const [likedSongs, playlists, playHistoryWeek, playHistoryAll] = await Promise.all([
      ncm.getUserLikedSongs(userAccount.uid),
      ncm.getUserPlaylists(userAccount.uid),
      ncm.getUserPlayHistory(userAccount.uid, 1),
      ncm.getUserPlayHistory(userAccount.uid, 0)
    ]);

    const userData = {
      user: userAccount,
      likedSongs,
      playlists,
      playHistory: {
        week: playHistoryWeek,
        all: playHistoryAll
      }
    };

    // 3. 导入数据
    const result = mode === 'full'
      ? await musicLibrary.importFull(userData)
      : await musicLibrary.importIncremental(userData);

    res.json(result);
  } catch (error) {
    console.error('导入音乐库失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/music/library/stats - 获取音乐库统计
 */
app.get('/api/music/library/stats', async (req, res) => {
  try {
    const stats = musicLibrary.getStats();
    res.json(stats || { message: '音乐库为空' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// 存储所有连接的客户端：clientId -> WebSocket
const clients = new Map();

wss.on('connection', (ws) => {
  let currentClientId = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // 处理客户端注册
      if (data.type === 'register') {
        const isNewClient = !clients.has(data.clientId);
        currentClientId = data.clientId;

        // 如果该 clientId 已存在，关闭旧连接
        if (clients.has(currentClientId)) {
          const oldWs = clients.get(currentClientId);
          if (oldWs.readyState === 1) {
            oldWs.close(1000, 'New connection established');
          }
        }

        // 保存新连接
        clients.set(currentClientId, ws);

        // 只在新客户端注册时打印日志
        if (isNewClient) {
          console.log(`[BACKEND] ✅ 新客户端注册: ${currentClientId.substring(0, 12)}..., 当前连接数: ${clients.size}`);
        }
        return;
      }

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
    // 只删除属于当前连接的 clientId
    if (currentClientId && clients.get(currentClientId) === ws) {
      clients.delete(currentClientId);
      console.log(`🔌 客户端已断开: ${currentClientId}, 剩余连接数: ${clients.size}`);
    }
  });
});

// 主动对话推送函数
const broadcastProactiveMessage = async () => {
  const decision = await proactiveAgent.checkAndSpeak();

  if (decision && decision.shouldSpeak) {
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

    clients.forEach((client, clientId) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      } else {
        // 清理无效连接
        clients.delete(clientId);
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
