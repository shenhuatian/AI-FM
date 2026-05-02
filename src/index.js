// 主服务器入口 - 四层架构整合
import express from 'express';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 第一层：外部上下文
import { NeteaseCloudMusic } from './music/ncm.js';
import { WeatherService } from './services/weather.js';
import { FeishuCalendarService } from './services/feishu.js';

// 第二层：本地大脑
import { DeepSeekAdapter } from './brain/deepseek.js';
import { StateManager } from './brain/state.js';
import { Router } from './brain/router.js';
import { ContextBuilder } from './brain/context.js';
import { TTSService } from './brain/tts.js';
import { Scheduler } from './brain/scheduler.js';
import { ProactiveAgent } from './brain/proactive.js';

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
const router = new Router(deepseek, ncm);
const contextBuilder = new ContextBuilder(state, weatherService, calendarService);
const tts = new TTSService(process.env.FISH_API_KEY);
const scheduler = new Scheduler(deepseek, ncm, state);
const proactiveAgent = new ProactiveAgent(deepseek, state, contextBuilder, ncm);

// 异步初始化状态管理器
await state.init();

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
    const { message, mood } = req.body;

    // 构建上下文
    const context = await contextBuilder.build({
      userInput: message,
      mood: mood
    });

    // 获取对话历史
    const conversationHistory = state.getConversationHistory(10);

    // 路由到相应处理器
    const result = await router.route(message, context, conversationHistory);

    // 保存对话
    await state.addMessage('user', message);
    await state.addMessage('assistant', result.say);

    // 搜索歌曲
    const songs = [];
    if (result.play && result.play.length > 0) {
      for (const playItem of result.play) {
        const [songName, artistName] = playItem.split(' - ').map(s => s.trim());
        const song = await ncm.findSong(songName, artistName);
        if (song) {
          songs.push(song);
          await state.addPlay(song, { reason: result.reason });
        }
      }
    }

    // 生成语音（如果配置了）
    let audioUrl = null;
    if (result.say && process.env.FISH_API_KEY) {
      const audioPath = await tts.synthesize(result.say);
      if (audioPath) {
        audioUrl = `/cache/tts/${path.basename(audioPath)}`;
      }
    }

    res.json({
      say: result.say,
      audioUrl: audioUrl,
      songs: songs,
      reason: result.reason,
      type: result.type
    });
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
${process.env.FISH_API_KEY ? '🎤 语音服务: 已启用' : ''}
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

        const result = await router.route(data.message, context);

        ws.send(JSON.stringify({
          type: 'response',
          data: result
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

// 将广播函数传递给 ProactiveAgent（通过修改调度逻辑）
// 这里我们需要修改 ProactiveAgent 的 scheduleNextCheck 来调用广播
const originalScheduleNextCheck = proactiveAgent.scheduleNextCheck.bind(proactiveAgent);
proactiveAgent.scheduleNextCheck = function() {
  if (!this.isRunning) return;

  const settings = state.getProactiveSettings();
  let baseInterval = this.getBaseInterval(settings.level);

  if (this.userResponseRate < 0.3) {
    baseInterval *= 2;
  }

  const randomFactor = 0.8 + Math.random() * 0.4;
  const actualInterval = baseInterval * randomFactor;

  console.log(`⏰ 下次主动检查将在 ${Math.round(actualInterval / 1000 / 60)} 分钟后`);

  this.checkInterval = setTimeout(async () => {
    await broadcastProactiveMessage();
    this.scheduleNextCheck();
  }, actualInterval);
};

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
