// DeepSeek API 适配器
import OpenAI from 'openai';
import fs from 'fs/promises';

export class DeepSeekAdapter {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com'
    });
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

      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.8,
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

    return `${djPersona}

## 用户音乐品味
${taste}

## 用户日常作息
${routines}

## 心情与音乐规则
${moodRules}

## 用户习惯分析（从播放历史中学习）
${userHabits}

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

### 3. 推荐策略
- 每次推荐1-3首歌曲即可，不要太多
- 优先推荐用户taste.md中明确喜欢的艺人和风格
- 根据当前时间和场景选择合适的歌曲
- 偶尔推荐一些新歌，但要符合用户品味

### 4. 输出格式
你必须返回有效的JSON格式，包含以下字段：
- say: 你要说的话（20-50字，简短自然，像朋友聊天）
- play: 歌曲数组，格式为 ["歌曲名 - 歌手名"]（1-3首）
- reason: 选择这些歌的原因（内部记录，用于学习）
- segue: 如何从上一首过渡到这一首（可选）

### 5. 示例对话风格
❌ 不好："根据您当前的心情状态，我为您精心挑选了以下歌曲..."
✅ 好："听起来你今天心情不错！来首轻快的《晴天》吧 ☀️"

❌ 不好："这首歌曲具有优美的旋律和深刻的歌词内涵..."
✅ 好："这首歌超好听，陶喆的经典，你肯定喜欢 🎵"
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
    const { time, weather, userInput, mood, calendar } = context;

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

    if (userInput) {
      message += `\n用户说: ${userInput}\n`;
    } else {
      // 如果用户没有输入，主动询问或推荐
      message += `\n用户没有说话。请主动询问用户的心情或状态，或者根据当前时间和场景主动推荐音乐。记住，你是一个有温度的DJ，不要只是被动等待指令。\n`;
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
}

export default DeepSeekAdapter;
