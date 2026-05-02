// DeepSeek API 适配器
import OpenAI from 'openai';
import fs from 'fs/promises';

export class DeepSeekAdapter {
  constructor(apiKey, stateManager = null) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com'
    });
    this.stateManager = stateManager;
  }

  /**
   * 简单的聊天接口（用于生成诗歌等简单任务）
   * @param {Array} messages - 消息数组
   * @returns {Promise<string>} AI回复
   */
  async chat(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 200
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('DeepSeek返回无效响应');
      }

      return response.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek chat调用失败:', error);
      throw error;
    }
  }

  /**
   * 调用DeepSeek进行DJ决策
   * @param {Object} context - 上下文信息
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} DJ决策结果
   */
  async decide(context, conversationHistory = []) {
    try {
      const systemPrompt = await this.buildSystemPrompt(context);

      // 构建消息历史
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // 添加对话历史（最近10条）
      const recentHistory = conversationHistory.slice(-10);
      messages.push(...recentHistory);

      // 添加当前用户消息
      const userMessage = this.buildUserMessage(context);
      messages.push({
        role: 'user',
        content: userMessage
      });

      console.log('🔵 发送请求到 DeepSeek...');
      console.log('📝 消息数量:', messages.length);
      console.log('📝 系统提示词长度:', messages[0].content.length);
      console.log('📝 用户消息:', messages[messages.length - 1].content);

      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      console.log('✅ DeepSeek 响应成功');
      console.log('📦 完整响应对象:', JSON.stringify(response, null, 2));

      // 检查响应是否有效
      if (!response || !response.choices || !response.choices[0]) {
        console.error('❌ DeepSeek返回无效响应');
        console.error('响应对象:', response);
        return {
          say: '抱歉，我现在有点忙，稍后再聊吧',
          play: [],
          reason: 'DeepSeek返回无效响应',
          segue: ''
        };
      }

      const messageContent = response.choices[0].message.content;
      console.log('📄 消息内容:', messageContent);
      console.log('📏 内容长度:', messageContent ? messageContent.length : 0);

      // 解析DeepSeek的回复
      const result = this.parseResponse(messageContent);
      console.log('✨ 解析结果:', result);
      return result;
    } catch (error) {
      console.error('DeepSeek API调用失败:', error);
      console.error('错误详情:', error.message);

      // 返回友好的错误响应，而不是抛出异常
      return {
        say: '抱歉，我现在有点问题...不过你可以直接告诉我想听什么歌，比如"播放周杰伦的晴天"',
        play: [],
        reason: 'API调用失败: ' + error.message,
        segue: ''
      };
    }
  }

  /**
   * 构建系统提示词
   * @param {Object} context - 上下文信息
   * @returns {Promise<string>} 系统提示词
   */
  async buildSystemPrompt(context) {
    const djPersona = await fs.readFile('prompts/dj-persona.md', 'utf-8');
    const taste = await fs.readFile('user/taste.md', 'utf-8');
    const routines = await fs.readFile('user/routines.md', 'utf-8');
    const moodRules = await fs.readFile('user/mood-rules.md', 'utf-8');

    // 分析用户习惯
    const userHabits = this.analyzeUserHabits(context.playHistory);

    // 🔥 新增：获取用户真实偏好（从反馈和收藏中学习）
    const userPreferences = this.analyzeUserPreferences();

    // 🔥 新增：读取用户的网易云音乐库
    const musicLibrary = await this.loadMusicLibrary();

    return `${djPersona}

## 用户音乐品味
${taste}

## 用户日常作息
${routines}

## 心情与音乐规则
${moodRules}

## 🔥🔥🔥 用户的网易云音乐库（最高优先级！）
${musicLibrary}

**重要规则**：
1. 当用户明确要求某个艺术家的歌曲时，**必须优先从音乐库中推荐**
2. 音乐库中的歌曲是用户真实喜欢的，权重最高
3. 如果用户要求的艺术家在音乐库中，绝对不要推荐其他艺术家
4. 例如：用户说"推荐陶喆的歌"，你必须从音乐库的陶喆歌曲中选择，不要推荐其他人

## 用户习惯分析（从播放历史中学习）
${userHabits}

## 🔥 用户真实偏好（从反馈和收藏中学习）
${userPreferences}

## 最近播放记录
${context.playHistory ? this.formatPlayHistory(context.playHistory) : '暂无历史记录'}

## 重要指导原则

### 1. 像朋友一样聊天
- 用自然、轻松的语气，不要太正式
- 可以开玩笑、分享音乐故事
- 主动关心用户的状态和心情
- 记住之前的对话内容，保持连贯性

### 2. 学习用户偏好
- 从播放历史中学习用户真正喜欢的歌曲类型
- 注意用户在不同时间段、不同心情下的选择
- 如果用户跳过某首歌，记住并避免再推荐类似的
- 如果用户重复听某首歌，说明很喜欢，可以推荐相似风格

### 3. 推荐策略（严格遵守优先级）
- **第一优先级**：用户明确要求的艺术家/歌曲，必须从音乐库中推荐
- **第二优先级**：用户taste.md中明确喜欢的艺人和风格
- **第三优先级**：根据当前时间和场景选择合适的歌曲
- 每次推荐3-5首歌曲，给用户更多选择
- 偶尔推荐一些新歌，但要符合用户品味

### 4. 输出格式（必须严格遵守）
你必须返回有效的JSON格式，包含以下字段：

{
  "say": "你要说的话（20-40字，自然简短，像朋友聊天，少用emoji）",
  "play": ["歌曲名1 - 歌手名1", "歌曲名2 - 歌手名2", "歌曲名3 - 歌手名3"],
  "reason": "为什么推荐第一首歌（会显示给用户，要写得自然友好）",
  "segue": ""
}

### 5. 示例对话风格
❌ 不好："根据您当前的心情状态，我为您精心挑选了以下歌曲..."
✅ 好："听起来你今天心情不错，来首轻快的晴天吧"

❌ 不好："这首歌曲具有优美的旋律和深刻的歌词内涵..."
✅ 好："这首歌超好听，陶喆的经典，你肯定喜欢"
`;
  }

  /**
   * 分析用户习惯
   * @param {Array} playHistory - 播放历史
   * @returns {string} 习惯分析
   */
  analyzeUserHabits(playHistory) {
    if (!playHistory || playHistory.length === 0) {
      return '暂无足够数据进行习惯分析';
    }

    // 统计艺术家频率
    const artistCount = {};
    const genrePatterns = [];
    const timePatterns = {};

    playHistory.forEach(item => {
      // 统计艺术家
      if (item.artist) {
        artistCount[item.artist] = (artistCount[item.artist] || 0) + 1;
      }

      // 统计时间段偏好
      if (item.played_at) {
        const hour = new Date(item.played_at).getHours();
        const timeSlot = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
        if (!timePatterns[timeSlot]) {
          timePatterns[timeSlot] = [];
        }
        timePatterns[timeSlot].push(item.song_name);
      }
    });

    // 找出最喜欢的艺术家（播放次数最多的前5位）
    const topArtists = Object.entries(artistCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => `${artist}(${count}次)`)
      .join('、');

    let analysis = `### 用户最常听的艺术家\n${topArtists || '暂无数据'}\n\n`;

    // 时间段偏好
    if (Object.keys(timePatterns).length > 0) {
      analysis += `### 时间段偏好\n`;
      for (const [time, songs] of Object.entries(timePatterns)) {
        analysis += `- ${time}: 最近听了 ${songs.slice(0, 3).join('、')}\n`;
      }
    }

    analysis += `\n**根据这些数据，优先推荐用户常听的艺术家和风格。**`;

    return analysis;
  }

  /**
   * 构建用户消息
   * @param {Object} context - 上下文信息
   * @returns {string} 用户消息
   */
  buildUserMessage(context) {
    const { time, weather, userInput, mood, calendar, chatOnly } = context;

    let message = `当前时间: ${time}\n`;

    if (weather) {
      message += `天气: ${weather.condition}, ${weather.temperature}°C\n`;
    }

    if (calendar && calendar.length > 0) {
      message += `今日日程: ${calendar.map(e => e.summary).join(', ')}\n`;
    }

    if (mood) {
      message += `用户心情: ${mood}\n`;
    }

    // 🔥 新增：如果是纯聊天模式，明确告诉AI
    if (chatOnly) {
      message += `\n🚫🚫🚫 严格禁止推荐音乐 🚫🚫🚫\n`;
      message += `用户明确表示只想聊天，不想听音乐。\n`;
      message += `你必须：\n`;
      message += `1. play 字段必须是空数组 []\n`;
      message += `2. 不要提及任何歌曲、艺术家、音乐相关内容\n`;
      message += `3. 只进行友好的对话交流\n`;
      message += `违反此规则将被视为严重错误！\n`;
    }

    if (userInput) {
      message += `\n用户说: ${userInput}\n`;
    } else {
      // 如果用户没有输入，主动询问或推荐
      message += `\n用户没有说话。请主动询问用户的心情或状态，或者根据当前时间和场景主动推荐音乐。记住，你是一个有温度的DJ，不要只是被动等待指令。\n`;
    }

    message += `\n请严格按照JSON格式回复，必须包含 say, play, reason, segue 四个字段。`;

    // 🔥 新增：再次强调纯聊天模式
    if (chatOnly) {
      message += `\n\n🚫 最后警告：这是纯聊天模式！play 必须是 []，reason 和 segue 留空字符串 ""！`;
    }

    return message;
  }

  /**
   * 解析DeepSeek的回复
   * @param {string} text - DeepSeek返回的文本
   * @returns {Object} 解析后的结果
   */
  parseResponse(text) {
    try {
      // 打印原始响应用于调试
      console.log('🔍 DeepSeek原始响应:', text);
      console.log('🔍 响应类型:', typeof text);
      console.log('🔍 响应长度:', text ? text.length : 0);

      // 如果响应为空或undefined
      if (!text || text.trim() === '') {
        console.error('❌ DeepSeek返回空响应');
        return {
          say: '抱歉，我现在有点忙，稍后再聊吧',
          play: [],
          reason: 'DeepSeek返回空响应',
          segue: ''
        };
      }

      const parsed = JSON.parse(text);
      console.log('✅ JSON解析成功:', parsed);

      // 验证必需字段
      if (!parsed.say && !parsed.play) {
        console.error('DeepSeek返回的JSON缺少必需字段');
        return {
          say: '让我想想该推荐什么歌给你...',
          play: [],
          reason: 'JSON格式不完整',
          segue: ''
        };
      }

      return {
        say: parsed.say || '来听听这首歌吧',
        play: Array.isArray(parsed.play) ? parsed.play : [],
        reason: parsed.reason || '用户请求',
        segue: parsed.segue || ''
      };
    } catch (error) {
      console.error('解析DeepSeek回复失败:', error);
      console.error('原始文本:', text);

      return {
        say: '抱歉，我遇到了一些问题...不过我可以帮你搜索音乐，告诉我你想听什么吧',
        play: [],
        reason: '解析失败: ' + error.message,
        segue: ''
      };
    }
  }

  /**
   * 格式化播放历史
   * @param {Array} history - 播放历史
   * @returns {string} 格式化后的历史
   */
  formatPlayHistory(history) {
    if (!history || history.length === 0) {
      return '暂无历史记录';
    }

    const recent = history.slice(-10); // 最近10首
    return recent.map(item =>
      `- ${item.song_name} - ${item.artist} (${item.played_at})`
    ).join('\n');
  }

  /**
   * 🔥 新增：分析用户真实偏好（从反馈和收藏中学习）
   * @returns {string} 用户偏好分析
   */
  analyzeUserPreferences() {
    if (!this.stateManager) {
      return '暂无用户偏好数据';
    }

    // 获取喜欢的歌曲
    const likedSongs = this.stateManager.getLikedSongs();

    // 获取不喜欢的歌曲
    const dislikedSongs = this.stateManager.getDislikedSongs();

    // 获取收藏的歌曲
    const favorites = this.stateManager.getFavorites();

    let analysis = '### 用户明确喜欢的歌曲\n';

    if (likedSongs.length > 0) {
      const topLiked = likedSongs.slice(0, 10);
      analysis += topLiked.map(song =>
        `- ${song.songName} - ${song.artist} ⭐`
      ).join('\n');
      analysis += '\n\n';
    } else {
      analysis += '暂无数据\n\n';
    }

    analysis += '### 用户收藏的歌曲\n';
    if (favorites.length > 0) {
      const topFavorites = favorites.slice(0, 10);
      analysis += topFavorites.map(song =>
        `- ${song.name} - ${song.artist} ❤️`
      ).join('\n');
      analysis += '\n\n';
    } else {
      analysis += '暂无数据\n\n';
    }

    analysis += '### 用户明确不喜欢的歌曲（避免推荐）\n';
    if (dislikedSongs.length > 0) {
      const topDisliked = dislikedSongs.slice(0, 10);
      analysis += topDisliked.map(song =>
        `- ${song.songName} - ${song.artist} 👎`
      ).join('\n');
      analysis += '\n\n';
    } else {
      analysis += '暂无数据\n\n';
    }

    analysis += `**重要提示**：
- 优先推荐用户喜欢和收藏过的歌曲的相似风格
- 绝对避免推荐用户明确不喜欢的歌曲
- 从用户的反馈中学习他们的真实品味，而不仅仅依赖 taste.md`;

    return analysis;
  }

  /**
   * 🔥 新增：加载用户的网易云音乐库
   * @returns {string} 音乐库分析
   */
  async loadMusicLibrary() {
    try {
      const libraryPath = 'user/my-music-library.json';
      const data = await fs.readFile(libraryPath, 'utf-8');
      const library = JSON.parse(data);

      let analysis = '### 用户的网易云音乐库\n\n';
      analysis += `导入时间: ${new Date(library.user.importedAt).toLocaleString('zh-CN')}\n\n`;

      // 最常听的歌曲（听歌排行前20）
      if (library.topSongs && library.topSongs.length > 0) {
        analysis += '#### 最常听的歌曲（网易云听歌排行）\n';
        const top20 = library.topSongs.slice(0, 20);
        analysis += top20.map((song, index) =>
          `${index + 1}. ${song.name} - ${song.artist} (播放${song.playCount}次)`
        ).join('\n');
        analysis += '\n\n';
      }

      // 喜欢的音乐（红心歌曲前30）
      if (library.likedSongs && library.likedSongs.length > 0) {
        analysis += '#### 喜欢的音乐（红心歌曲）\n';
        const top30 = library.likedSongs.slice(0, 30);
        analysis += top30.map(song =>
          `- ${song.name} - ${song.artist}`
        ).join('\n');
        analysis += '\n\n';
      }

      // 用户歌单
      if (library.playlists && library.playlists.length > 0) {
        analysis += '#### 用户的歌单\n';
        library.playlists.forEach(playlist => {
          analysis += `\n**${playlist.name}** (${playlist.trackCount}首):\n`;
          if (playlist.songs && playlist.songs.length > 0) {
            const songs = playlist.songs.slice(0, 10);
            analysis += songs.map(song =>
              `  - ${song.name} - ${song.artist}`
            ).join('\n');
            if (playlist.songs.length > 10) {
              analysis += `\n  ... 还有 ${playlist.songs.length - 10} 首`;
            }
            analysis += '\n';
          }
        });
        analysis += '\n';
      }

      analysis += `\n**重要提示**：
- 这是用户在网易云音乐的真实听歌数据，非常重要！
- 优先推荐用户常听和喜欢的歌曲及其相似风格
- 用户的听歌排行反映了真实偏好，权重最高
- 参考用户的歌单来理解不同场景下的音乐需求`;

      return analysis;
    } catch (error) {
      // 如果文件不存在或读取失败，返回提示
      return '### 用户的网易云音乐库\n\n暂未导入。提示用户运行 `npm run import:music` 来导入网易云音乐数据。';
    }
  }

  /**
   * 🔥 新增：AI判断是否应该主动说话
   * @param {Object} context - 上下文信息
   * @param {Array} triggers - 触发条件
   * @param {string} lastProactiveMessage - 上次主动说的话
   * @returns {Promise<Object>} 决策结果
   */
  async decideProactive(context, triggers, lastProactiveMessage = null) {
    try {
      const systemPrompt = `你是Claudio，一个有温度的AI DJ。你现在可以主动和用户聊天。

## 你的主动对话原则

1. **自然友好** - 像朋友一样主动关心，不要太正式
2. **适度频率** - 不要过度打扰，选择合适的时机
3. **多样化** - 不要总是说同样的话，要有变化
4. **有价值** - 主动说话要有意义（推荐音乐、关心用户、分享有趣的事）
5. **记忆上下文** - 记住之前说过什么，避免重复

## 你可以选择的意图

- **recommend** - 推荐音乐（根据时间、心情、场景）
- **chat** - 闲聊（问候、关心、分享音乐故事）
- **ask** - 询问用户状态（心情、需求）
- **joke** - 讲笑话或分享有趣的事
- **silent** - 保持安静（如果觉得不合适打扰）

## 注意事项

- 如果用户正在忙碌（工作时间），要更谨慎
- 如果上次主动说话用户没回复，这次要更谨慎
- 深夜时段要安静，除非有特殊原因
- 不要连续推荐同类型的歌曲
- 讲笑话要适度，不要太频繁`;

      const userPrompt = `
当前情况：
- 时间：${context.time}
- 天气：${context.weather ? `${context.weather.condition}, ${context.weather.temperature}°C` : '未知'}
- 触发条件：${triggers.map(t => t.description).join('；')}
- 最近播放：${context.playHistory.slice(0, 3).map(p => `${p.song_name} - ${p.artist}`).join(', ') || '暂无'}
${lastProactiveMessage ? `- 上次主动说的话：${lastProactiveMessage}` : ''}

请判断：
1. 是否应该主动说话？（考虑时机是否合适）
2. 如果说话，应该说什么？（要自然、有价值、不重复）
3. 是否需要推荐音乐？

请返回JSON格式：
{
  "shouldSpeak": true/false,
  "message": "你要说的话（20-40字，自然简短）",
  "intent": "recommend/chat/ask/joke/silent",
  "songs": ["歌曲名1 - 歌手名1", "歌曲名2 - 歌手名2"],
  "reason": "为什么推荐这些歌（如果有推荐）"
}

如果不应该说话，返回 { "shouldSpeak": false }
`;

      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8, // 提高温度，增加多样性
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      if (!response || !response.choices || !response.choices[0]) {
        console.error('❌ DeepSeek返回无效响应');
        return { shouldSpeak: false };
      }

      const result = JSON.parse(response.choices[0].message.content);
      console.log('🤖 AI主动对话决策:', result);

      return {
        shouldSpeak: result.shouldSpeak || false,
        message: result.message || '',
        intent: result.intent || 'chat',
        songs: result.songs || [],
        reason: result.reason || ''
      };
    } catch (error) {
      console.error('❌ AI主动对话决策失败:', error);
      return { shouldSpeak: false };
    }
  }
}

export default DeepSeekAdapter;
