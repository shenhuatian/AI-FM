// DeepSeek API 适配器
import OpenAI from 'openai';
import fs from 'fs/promises';
import musicVectorStore from './music-vector-store.js';

export class DeepSeekAdapter {
  constructor(apiKey, stateManager = null) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com',
      timeout: 30000, // 30秒超时
      maxRetries: 2
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
   * 🔥 新增：意图分析接口
   * 专门用于分析用户的音乐请求意图
   * @param {string} userMessage - 用户消息
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} 意图分析结果
   */
  async analyzeIntent(userMessage, conversationHistory = []) {
    try {
      console.log(`\n🧠 DeepSeek 意图分析: "${userMessage}"`);

      // 构建意图分析的系统提示词
      const systemPrompt = `你是一个音乐意图分析专家。你的任务是分析用户的音乐请求，提取关键信息。

## 你需要提取的信息

1. **intent** - 意图类型
   - "music_request": 用户想听音乐
   - "chat": 用户只想聊天
   - "feedback": 用户对推荐的反馈

2. **song** - 歌曲名称（如果用户指定了具体歌曲）
   - 例如："播放唯一" → "唯一"
   - 例如："我想听稻香" → "稻香"
   - 例如："来首晴天" → "晴天"
   - 如果没有指定具体歌曲，返回 null
   - 注意：只提取歌曲名，不包括艺术家

3. **artist** - 艺术家名称（如果用户指定了）
   - 例如："周杰伦的歌" → "周杰伦"
   - 例如："Taylor Swift" → "Taylor Swift"
   - 如果没有指定，返回 null

4. **confidence** - 置信度（0-1之间的小数）
   - 如果用户明确指定了歌曲名和艺术家，返回 0.9-1.0
   - 如果只指定了歌曲名，返回 0.5-0.7
   - 如果只是模糊描述（心情、风格），返回 0.3-0.5
   - 用于判断是否需要反问用户

5. **mood** - 心情/情绪
   - 例如："欢快"、"悲伤"、"放松"、"激动"、"浪漫"、"充满活力"、"平静"、"忧郁"
   - 如果没有明确心情，返回 null

4. **style** - 音乐风格（数组）
   - 例如：["流行"]、["摇滚"]、["民谣"]、["电子"]、["爵士"]、["说唱"]
   - 语种也算风格：["华语"]、["欧美"]、["日语"]、["韩语"]、["西班牙语"]
   - 如果没有指定，返回空数组 []

5. **tempo** - 节奏
   - "fast": 快节奏（欢快、激动、兴奋）
   - "medium": 中等节奏
   - "slow": 慢节奏（悲伤、放松、舒缓）
   - null: 未指定

6. **energy** - 能量
   - "high": 高能量（激动、兴奋、充满活力）
   - "medium": 中等能量
   - "low": 低能量（安静、舒缓、放松）
   - null: 未指定

7. **freshness** - 新鲜度偏好（非常重要！）
   - "fresh": 偏好新鲜、没听过的歌、小众、冷门、深度、B面曲
   - "familiar": 偏好熟悉的歌、经典、热门
   - "mixed": 混合
   - null: 未指定

8. **count** - 推荐数量
   - 默认 5 首
   - 如果用户说"来一首"，返回 1
   - 如果用户说"多来点"，返回 10

9. **keywords** - 关键词（数组）
   - 提取用户消息中的关键词，用于搜索
   - 例如："欢快的歌" → ["欢快"]
   - 例如："周杰伦的小众歌" → ["周杰伦", "小众"]

## 🔥 新鲜度识别规则（重点！）

用户说以下词语时，**必须**设置 freshness = "fresh"：
- "没怎么听过"、"没听过"、"不太熟"
- "小众"、"冷门"、"深度"、"宝藏"
- "B面"、"专辑深度曲目"
- "不要热门"、"不要主打"、"不要烂大街"
- "新鲜"、"探索"、"发现"

用户说以下词语时，设置 freshness = "familiar"：
- "经典"、"热门"、"流行"、"耳熟能详"
- "代表作"、"主打歌"

## 示例

用户："播放唯一"
返回：
{
  "intent": "music_request",
  "song": "唯一",
  "artist": null,
  "confidence": 0.6,
  "mood": null,
  "style": [],
  "tempo": null,
  "energy": null,
  "freshness": "mixed",
  "count": 1,
  "keywords": ["唯一"]
}

用户："我想听王力宏的唯一"
返回：
{
  "intent": "music_request",
  "song": "唯一",
  "artist": "王力宏",
  "confidence": 0.95,
  "mood": null,
  "style": [],
  "tempo": null,
  "energy": null,
  "freshness": "mixed",
  "count": 1,
  "keywords": ["唯一", "王力宏"]
}

用户："算了，给我放一些欢快一点的歌吧"
返回：
{
  "intent": "music_request",
  "song": null,
  "artist": null,
  "confidence": 0.4,
  "mood": "欢快",
  "style": ["流行"],
  "tempo": "fast",
  "energy": "high",
  "freshness": "mixed",
  "count": 5,
  "keywords": ["欢快"]
}

用户："我想听周杰伦的歌，要那种我没怎么听过的"
返回：
{
  "intent": "music_request",
  "song": null,
  "artist": "周杰伦",
  "confidence": 0.8,
  "mood": null,
  "style": [],
  "tempo": null,
  "energy": null,
  "freshness": "fresh",
  "count": 5,
  "keywords": ["周杰伦", "没听过", "小众"]
}

用户："来首悲伤的民谣吧"
返回：
{
  "intent": "music_request",
  "song": null,
  "artist": null,
  "confidence": 0.4,
  "mood": "悲伤",
  "style": ["民谣"],
  "tempo": "slow",
  "energy": "low",
  "freshness": "mixed",
  "count": 1,
  "keywords": ["悲伤", "民谣"]
}

用户："推荐一些充满活力的欧美流行乐"
返回：
{
  "intent": "music_request",
  "song": null,
  "artist": null,
  "confidence": 0.5,
  "mood": "充满活力",
  "style": ["欧美", "流行"],
  "tempo": "fast",
  "energy": "high",
  "freshness": "mixed",
  "count": 5,
  "keywords": ["充满活力", "欧美", "流行"]
}

用户："来点日语的小众歌曲"
返回：
{
  "intent": "music_request",
  "song": null,
  "artist": null,
  "confidence": 0.5,
  "mood": null,
  "style": ["日语"],
  "tempo": null,
  "energy": null,
  "freshness": "fresh",
  "count": 5,
  "keywords": ["日语", "小众"]
}

## 重要规则

1. 必须返回有效的 JSON 格式
2. 所有字段都必须存在（即使是 null 或空数组）
3. 不要猜测用户没有提到的信息，使用 null 或默认值
4. 关键词要准确，不要添加用户没说的词
5. **特别注意 freshness 字段**：用户说"没听过"、"小众"等词时，必须设置为 "fresh"`;

      // 构建消息
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // 添加对话历史（最近 3 条，用于上下文理解）
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-3);
        messages.push(...recentHistory);
      }

      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: `请分析以下用户消息的意图：\n\n"${userMessage}"\n\n请返回 JSON 格式的分析结果。`
      });

      // 调用 DeepSeek
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.3, // 降低温度，提高准确性
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('DeepSeek 返回无效响应');
      }

      const result = JSON.parse(response.choices[0].message.content);
      console.log('✅ 意图分析结果:', result);

      // 验证必需字段
      const intent = {
        intent: result.intent || 'music_request',
        song: result.song || null,
        artist: result.artist || null,
        confidence: result.confidence || 0.5,
        mood: result.mood || null,
        style: Array.isArray(result.style) ? result.style : [],
        tempo: result.tempo || null,
        energy: result.energy || null,
        freshness: result.freshness || 'mixed',
        avoidance: Array.isArray(result.avoidance) ? result.avoidance : [],
        count: result.count || 5,
        keywords: Array.isArray(result.keywords) ? result.keywords : []
      };

      return intent;
    } catch (error) {
      console.error('❌ 意图分析失败:', error);

      // 返回默认意图
      return {
        intent: 'music_request',
        song: null,
        artist: null,
        confidence: 0.5,
        mood: null,
        style: [],
        tempo: null,
        energy: null,
        freshness: 'mixed',
        avoidance: [],
        count: 5,
        keywords: []
      };
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

## 🎯 音乐推荐策略（最高优先级！）

### 探索与利用平衡
你的推荐应该遵循 **70% 探索 + 30% 舒适区** 的策略：

**70% 探索模式：** 推荐用户可能没听过的新歌
**30% 舒适区模式：** 从用户音乐库推荐熟悉的歌

### 重要原则
1. 用户明确要求的歌曲必须搜索（即使音乐库没有）
2. 不要局限于音乐库，大部分推荐来自网易云搜索
3. 多样性保证：不重复最近50首，同一艺术家最多2首

### 输出格式（新增 searchMode 字段）
{
  "say": "你要说的话",
  "play": ["歌曲名 - 歌手名"],
  "searchMode": "explore",
  "reason": "推荐理由"
}

searchMode: "explore" = 从网易云搜索新歌（70%）
searchMode: "comfort" = 从音乐库搜索（30%）

## 用户的网易云音乐库（仅供参考）
${musicLibrary}

**说明：** 音乐库只是参考，70%推荐应来自网易云搜索

## 用户习惯分析（从播放历史中学习）
${userHabits}

## 🔥 用户真实偏好（从反馈和收藏中学习）
${userPreferences}

## 最近播放记录
${context.playHistory ? this.formatPlayHistory(context.playHistory) : '暂无历史记录'}

## 🔥🔥🔥 关键词识别规则（最高优先级）

### 艺术家识别
- 用户说"XX的歌" → **只推荐该艺术家的歌**（独唱或合唱都可以）
- 例如："陶喆的歌" → 只推荐陶喆参与的歌曲（包括《今天你要嫁给我》等合唱）
- **严格遵守**：如果用户指定了艺术家，绝对不要推荐其他艺术家

### 新鲜度识别
- "没怎么听过" / "小众" / "冷门" / "深度" / "不太熟" / "新鲜" → **避开热门曲，推荐B面曲、专辑深度曲目**
- 例如：陶喆的深度曲目：《寂寞的季节》《黑色柳丁》《谁的奥斯卡》《爱很简单》《Susan说》《二十二》
- **绝对不要推荐**：《今天你要嫁给我》《普通朋友》等超级热门曲

### 排除规则
- 检查用户最近播放历史（上面的"最近播放记录"），**绝对不要推荐最近10首内的歌曲**
- 检查用户"不喜欢"的歌曲，**绝对不要推荐**
- **同一首歌不要推荐两次**（即使艺术家顺序不同）

### 示例
用户："给我推荐一些陶喆的歌吧，我想要听一些我没怎么听过的"
✅ 正确：《寂寞的季节》《黑色柳丁》《谁的奥斯卡》《Susan说》
❌ 错误：《今天你要嫁给我》（太热门，用户肯定听过）

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
- **绝对避免重复**：不要推荐最近播放过的歌曲
- **多样性**：推荐不同风格、不同时期的歌曲，避免都是热门曲
- **深度挖掘**：如果用户要求"没怎么听过"，推荐专辑深度曲目，而不是主打歌

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
      analysis += `导入时间: ${new Date(library.user.importedAt).toLocaleString('zh-CN')}\n`;
      analysis += `总歌曲数: ${musicVectorStore.getStats().totalSongs} 首\n\n`;

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
- 这是用户在网易云音乐的真实听歌数据，可以作为参考
- 用户的听歌排行反映了真实偏好，可以用来理解用户品味
- 参考用户的歌单来理解不同场景下的音乐需求
- **但是！音乐库只是参考，不要局限于此**
- **70% 的推荐应该来自网易云搜索的新歌（探索模式）**
- **30% 的推荐可以从音乐库选择（舒适区模式）**
- 使用 searchMode 字段来标记：explore（搜索新歌）或 comfort（音乐库）`;

      return analysis;
    } catch (error) {
      // 如果文件不存在或读取失败，返回提示
      return '### 用户的网易云音乐库\n\n暂未导入。提示用户运行 `npm run import:music` 来导入网易云音乐数据。';
    }
  }

  /**
   * 🔥 新增：验证搜索结果是否匹配意图
   * @param {Object} intent - 用户意图
   * @param {Array} searchResults - 搜索结果
   * @param {Object} userProfile - 用户画像
   * @returns {Promise<Object>} 验证结果
   */
  async verifySongMatch(intent, searchResults, userProfile = null) {
    try {
      console.log(`\n🔍 验证搜索结果是否匹配意图`);

      if (!searchResults || searchResults.length === 0) {
        return {
          match: false,
          reason: '没有搜索结果',
          suggestion: null
        };
      }

      // 构建上下文
      const context = {
        userRequest: {
          song: intent.song,
          artist: intent.artist,
          keywords: intent.keywords
        },
        searchResults: searchResults.slice(0, 3).map(s => ({
          name: s.name,
          artist: s.artist,
          album: s.album
        })),
        userProfile: userProfile ? {
          favoriteArtists: userProfile.favoriteArtists || [],
          recentMood: userProfile.recentMood
        } : null
      };

      const systemPrompt = `你是一个音乐匹配验证专家。你需要判断搜索结果是否匹配用户的意图。

## 判断规则

1. **完全匹配** (match: true)
   - 歌曲名完全一致
   - 如果用户指定了艺术家，艺术家也要匹配
   - 如果用户没指定艺术家，但搜索结果是用户常听的艺术家，也算匹配

2. **不匹配** (match: false)
   - 歌曲名不一致
   - 用户指定了艺术家，但搜索结果是其他艺术家
   - 搜索结果明显不符合用户意图

3. **建议**
   - 如果不匹配，给出改进搜索的建议
   - 例如：添加艺术家名、添加专辑名、使用更精确的关键词

## 返回格式

返回 JSON 格式：
{
  "match": true/false,
  "reason": "匹配/不匹配的原因",
  "suggestion": "改进建议（如果不匹配）"
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `请验证以下搜索结果是否匹配用户意图：\n\n${JSON.stringify(context, null, 2)}`
        }
      ];

      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('DeepSeek 返回无效响应');
      }

      const result = JSON.parse(response.choices[0].message.content);
      console.log(`✅ 验证结果:`, result);

      return {
        match: result.match || false,
        reason: result.reason || '未知原因',
        suggestion: result.suggestion || null
      };
    } catch (error) {
      console.error('❌ 验证失败:', error);

      // 默认认为匹配（避免过度拦截）
      return {
        match: true,
        reason: '验证失败，默认通过',
        suggestion: null
      };
    }
  }

  /**
   * 🔥 新增：生成反问选项
   * 当检测到同名歌曲时，生成友好的反问消息
   * @param {string} songName - 歌曲名称
   * @param {Array} versions - 不同艺术家的版本列表
   * @returns {Promise<Object>} 反问结果
   */
  async generateAskForClarification(songName, versions) {
    try {
      console.log(`\n❓ 生成反问: ${songName} (${versions.length} 个版本)`);

      // 构建选项列表
      const options = versions.map((v, index) => {
        return `${index + 1}. ${v.mainArtist} - 《${v.name}》 (${v.album})`;
      }).join('\n');

      // 构建提示词
      const systemPrompt = `你是一个友好的AI DJ。用户想听《${songName}》，但这首歌有多个艺术家的版本。
你需要用简短、友好的方式询问用户想听哪个版本。

要求：
1. 语气轻松、自然，像朋友聊天
2. 简短，不超过2句话
3. 提到有多个版本，让用户选择
4. 可以提供"随机播放"或"全部播放"的选项

示例：
"《唯一》有好几个版本呢！王力宏、邓紫棋、告五人都唱过，你想听谁的？或者我随机/全部播放？"
"这首歌很火啊！有王力宏的经典版，也有邓紫棋的翻唱版，你更喜欢哪个？"`;

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `歌曲名: ${songName}\n\n可选版本:\n${options}\n\n请生成一个友好的反问消息。`
        }
      ];

      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('DeepSeek 返回无效响应');
      }

      const message = response.choices[0].message.content.trim();
      console.log(`✅ 反问消息: ${message}`);

      return {
        type: 'ask_clarification',
        message: message,
        songName: songName,
        versions: versions,
        options: [
          ...versions.map((v, i) => ({
            id: i + 1,
            label: v.mainArtist,
            song: v
          })),
          { id: 'random', label: '随机播放', song: null },
          { id: 'all', label: '全部播放', song: null }
        ]
      };
    } catch (error) {
      console.error('❌ 生成反问失败:', error);

      // 返回默认反问
      return {
        type: 'ask_clarification',
        message: `《${songName}》有多个版本，你想听哪个艺术家的？`,
        songName: songName,
        versions: versions,
        options: [
          ...versions.map((v, i) => ({
            id: i + 1,
            label: v.mainArtist,
            song: v
          })),
          { id: 'random', label: '随机播放', song: null },
          { id: 'all', label: '全部播放', song: null }
        ]
      };
    }
  }

  /**
   * 🔥 新增：根据推荐的歌曲生成自然的回复
   * @param {string} userMessage - 用户消息
   * @param {Array} songs - 推荐的歌曲列表
   * @param {Object} intent - 意图分析结果
   * @returns {Promise<Object>} 回复结果
   */
  async generateReply(userMessage, songs, intent) {
    try {
      console.log(`\n💬 DeepSeek 生成回复`);
      console.log(`   用户消息: "${userMessage}"`);
      console.log(`   推荐歌曲数: ${songs.length}`);

      // 构建系统提示词
      const systemPrompt = `你是 Phoenix，一个有温度的 AI DJ。你刚刚为用户推荐了一些歌曲，现在需要用自然、友好的语气告诉用户。

## 你的风格

- 像朋友一样聊天，不要太正式
- 简短自然（20-40字）
- 少用 emoji
- 不要说"根据您的需求"、"为您精心挑选"等客套话

## 推荐的歌曲

${songs.map((s, i) => `${i + 1}. ${s.name} - ${s.artist}`).join('\n')}

## 用户的意图

${JSON.stringify(intent, null, 2)}

## 你需要返回的 JSON 格式

{
  "say": "你要说的话（20-40字，自然简短）",
  "reason": "为什么推荐第一首歌（简短说明，会显示给用户）"
}

## 示例

用户："算了，给我放一些欢快一点的歌吧"
推荐：晴天 - 周杰伦、告白气球 - 周杰伦
返回：
{
  "say": "好嘞，那就换个心情！来几首轻快带感的",
  "reason": "周杰伦的经典，轻快又好听"
}

用户："我想听周杰伦的歌，要那种我没怎么听过的"
推荐：黑色幽默 - 周杰伦、梯田 - 周杰伦
返回：
{
  "say": "给你挑了几首周董的深度曲目，都是宝藏歌曲",
  "reason": "这首比较小众，但很有味道"
}`;

      // 调用 DeepSeek
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户说："${userMessage}"\n\n请生成自然的回复。` }
        ],
        temperature: 0.8, // 提高温度，增加自然度
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('DeepSeek 返回无效响应');
      }

      const result = JSON.parse(response.choices[0].message.content);
      console.log('✅ 生成回复:', result);

      return {
        say: result.say || '来听听这些歌吧',
        reason: result.reason || '推荐给你'
      };
    } catch (error) {
      console.error('❌ 生成回复失败:', error);

      // 返回默认回复
      return {
        say: '来听听这些歌吧',
        reason: '推荐给你'
      };
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
      const systemPrompt = `你是Phoenix，一个有温度的AI DJ。你现在可以主动和用户聊天。

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

  /**
   * 🔥 新增：过滤候选歌曲（判断是否符合用户意图）
   * @param {Array} candidates - 候选歌曲列表
   * @param {Object} intent - 用户意图
   * @param {number} limit - 返回数量
   * @returns {Promise<Array>} 过滤后的歌曲列表
   */
  async filterSongs(candidates, intent, limit = 5) {
    try {
      console.log(`\n🧠 DeepSeek 过滤歌曲`);
      console.log(`   候选歌曲数: ${candidates.length}`);
      console.log(`   用户意图:`, JSON.stringify(intent, null, 2));

      if (candidates.length === 0) {
        console.log(`⚠️ 没有候选歌曲，无需过滤`);
        return [];
      }

      // 如果候选歌曲少于等于需要的数量，直接返回
      if (candidates.length <= limit) {
        console.log(`✅ 候选歌曲数量 <= ${limit}，直接返回`);
        return candidates;
      }

      // 构建系统提示词
      const systemPrompt = `你是一个音乐推荐专家。你的任务是根据用户的意图，从候选歌曲中筛选出最符合的歌曲。

## 用户意图

${JSON.stringify(intent, null, 2)}

## 候选歌曲

${candidates.map((s, i) => `${i + 1}. ${s.name} - ${s.artist}`).join('\n')}

## 你的任务

1. 分析每首歌曲是否符合用户意图
2. 考虑以下因素：
   - **艺术家匹配**：如果用户指定了艺术家，必须严格匹配
   - **心情匹配**：歌曲的情绪是否符合用户的心情需求
   - **风格匹配**：歌曲的风格是否符合用户的偏好
   - **节奏匹配**：歌曲的节奏（快/中/慢）是否符合
   - **能量匹配**：歌曲的能量（高/中/低）是否符合
   - **新鲜度**：如果用户要求"新鲜"、"小众"、"没听过"，避免超级热门曲

3. 返回最符合的 ${limit} 首歌曲的索引（从 1 开始）

## 判断标准

### 艺术家匹配（最高优先级）
- 如果用户指定了艺术家，**必须严格匹配**
- 例如：用户要"周杰伦的歌" → 只能推荐周杰伦的歌（独唱或合唱都可以）

### 心情匹配
- "欢快"、"充满活力" → 选择轻快、明亮、节奏感强的歌
- "悲伤"、"忧郁" → 选择抒情、慢节奏、情感深沉的歌
- "放松"、"平静" → 选择舒缓、柔和的歌
- "激动"、"兴奋" → 选择高能量、快节奏的歌

### 风格匹配
- 根据歌曲名称和艺术家判断风格
- 例如：摇滚、流行、民谣、电子、爵士等

### 新鲜度判断
- 如果用户要求"新鲜"、"小众"、"没听过"、"深度"：
  - ❌ 避免超级热门曲（如《晴天》《告白气球》《七里香》等）
  - ✅ 推荐专辑深度曲目、B面曲、较少人知道的歌
- 判断依据：
  - 歌曲名称是否是艺术家的代表作
  - 艺术家的知名度（周杰伦、Taylor Swift 等的热门曲要谨慎）

### 版本判断
- ❌ 避免：Live 版、翻唱版、DJ 版、Remix、伴奏、铃声
- ✅ 优先：原版、录音室版本

## 输出格式

返回 JSON 格式：
{
  "selected": [1, 5, 8, 12, 15],
  "reason": "简短说明为什么选择这些歌曲（50字以内）"
}

**重要**：selected 数组必须包含 ${limit} 个索引（从 1 开始），按推荐优先级排序。`;

      // 调用 DeepSeek
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请从候选歌曲中筛选出最符合用户意图的 ${limit} 首歌曲。` }
        ],
        temperature: 0.3, // 降低温度，提高准确性
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('DeepSeek 返回无效响应');
      }

      const result = JSON.parse(response.choices[0].message.content);
      console.log('✅ 过滤结果:', result);

      // 验证结果
      if (!result.selected || !Array.isArray(result.selected) || result.selected.length === 0) {
        console.log('⚠️ DeepSeek 返回的结果无效，使用前 N 首');
        return candidates.slice(0, limit);
      }

      // 根据索引提取歌曲
      const filtered = result.selected
        .map(index => candidates[index - 1]) // 索引从 1 开始，转换为从 0 开始
        .filter(song => song !== undefined); // 过滤掉无效索引

      console.log(`✅ 过滤后歌曲数: ${filtered.length}`);
      console.log(`   理由: ${result.reason}`);

      // 如果过滤后的歌曲数量不足，补充候选歌曲
      if (filtered.length < limit) {
        console.log(`⚠️ 过滤后歌曲不足 ${limit} 首，补充候选歌曲`);
        const remaining = candidates.filter(c => !filtered.includes(c));
        filtered.push(...remaining.slice(0, limit - filtered.length));
      }

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('❌ 过滤歌曲失败:', error);

      // 失败时返回前 N 首候选歌曲
      console.log(`⚠️ 过滤失败，返回前 ${limit} 首候选歌曲`);
      return candidates.slice(0, limit);
    }
  }
}

export default DeepSeekAdapter;
