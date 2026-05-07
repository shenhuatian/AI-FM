// LangChain 适配器 - 提供对话记忆和上下文管理
import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate
} from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import fs from 'fs/promises';
import musicVectorStore from './music-vector-store.js';

export class LangChainAdapter {
  constructor(apiKey, stateManager = null) {
    this.apiKey = apiKey;
    this.stateManager = stateManager;

    // 简单的对话记忆（保留最近 10 轮对话）
    this.chatHistory = [];
    this.maxHistoryLength = 10;

    // 系统提示词
    this.systemPrompt = null;
  }

  /**
   * 创建 LLM 实例（根据场景动态设置 maxTokens）
   */
  createLLM(maxTokens = 500) {
    return new ChatOpenAI({
      apiKey: this.apiKey,
      modelName: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: maxTokens,
      configuration: {
        baseURL: 'https://api.deepseek.com/v1'
      }
    });
  }

  /**
   * 初始化系统提示词
   */
  async initSystemPrompt() {
    if (!this.systemPrompt) {
      this.systemPrompt = await this.buildSystemPrompt();
    }
  }

  /**
   * 构建系统提示词
   */
  async buildSystemPrompt() {
    const djPersona = await fs.readFile('prompts/dj-persona.md', 'utf-8');
    const taste = await fs.readFile('user/taste.md', 'utf-8');
    const routines = await fs.readFile('user/routines.md', 'utf-8');
    const moodRules = await fs.readFile('user/mood-rules.md', 'utf-8');

    // 获取用户习惯
    const userHabits = this.stateManager ? this.analyzeUserHabits() : '';
    const userPreferences = this.stateManager ? this.analyzeUserPreferences() : '';
    const musicLibrary = await this.loadMusicLibrary();

    return `${djPersona}

## 用户音乐品味
${taste}

## 用户日常作息
${routines}

## 心情与音乐规则
${moodRules}

## 🔥 用户的网易云音乐库（最高优先级！）
${musicLibrary}

${userHabits}

${userPreferences}

## 🔥🔥🔥 关键词识别规则（最高优先级）

### 艺术家识别
- 用户说"XX的歌" → **只推荐该艺术家的歌**（独唱或合唱都可以）
- 例如："陶喆的歌" → 只推荐陶喆参与的歌曲
- **严格遵守**：如果用户指定了艺术家，绝对不要推荐其他艺术家

### 新鲜度识别
- "没怎么听过" / "小众" / "冷门" / "深度" → **避开热门曲，推荐B面曲、专辑深度曲目**
- **绝对不要推荐**超级热门曲

### 上下文理解（最重要！）
- 如果用户说"这些"、"太...了"、"不够"、"换个"、"更..."，说明用户在对上一轮推荐进行反馈
- 你必须理解用户指的是什么，并基于上一轮的推荐进行调整
- 例如：
  - 用户："推荐陶喆的歌"
  - 你："好的，推荐《今天你要嫁给我》..."
  - 用户："这些有点太热门了"
  - 你应该理解："这些"指的是刚才推荐的陶喆的歌，用户想要更小众的陶喆歌曲

### 排除规则
- 检查对话历史，**绝对不要推荐刚才推荐过的歌曲**
- 检查用户"不喜欢"的歌曲，**绝对不要推荐**

## 输出格式（必须严格遵守）
你必须返回有效的JSON格式，包含以下字段：

{
  "say": "你要说的话（推荐音乐时：20-40字简短；纯聊天时：可以更详细，50-150字，像朋友一样分享想法和感受）",
  "play": ["歌曲名1 - 歌手名1", "歌曲名2 - 歌手名2", "歌曲名3 - 歌手名3"],
  "reason": "为什么推荐第一首歌（会显示给用户）",
  "segue": ""
}

## 重要提示
- 你有完整的对话历史记忆，可以看到之前所有的对话
- 当用户说"这些"、"那些"时，回顾对话历史，理解用户指的是什么
- 保持对话的连贯性，像真正的朋友一样聊天
- **当用户只想聊天（不要音乐）时，你可以更详细地回答，分享你的想法、感受和建议，让对话更有温度**`;
  }

  /**
   * 调用 LangChain 进行对话
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 决策结果
   */
  async decide(context) {
    try {
      // 初始化系统提示词
      await this.initSystemPrompt();

      // 构建用户输入
      const userInput = this.buildUserInput(context);

      // 🔥 根据场景动态设置 maxTokens
      let maxTokens = 500; // 默认：推荐音乐
      if (context.chatOnly) {
        maxTokens = 1200; // 纯聊天：更长的回复
        console.log('💬 纯聊天模式，maxTokens: 1200');
      } else {
        console.log('🎵 推荐音乐模式，maxTokens: 500');
      }

      // 创建 LLM 实例
      const llm = this.createLLM(maxTokens);

      console.log('🔵 发送请求到 LangChain...');
      console.log('📝 用户输入:', userInput);
      console.log('📝 对话历史长度:', this.chatHistory.length);

      // 构建消息列表
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userInput }
      ];

      // 调用 LLM
      const response = await llm.invoke(messages);

      console.log('✅ LangChain 响应成功');
      console.log('📄 响应内容:', response.content);

      // 保存到对话历史
      this.chatHistory.push({ role: 'user', content: userInput });
      this.chatHistory.push({ role: 'assistant', content: response.content });

      // 保持历史长度在限制内
      if (this.chatHistory.length > this.maxHistoryLength * 2) {
        this.chatHistory = this.chatHistory.slice(-this.maxHistoryLength * 2);
      }

      // 解析响应
      const result = this.parseResponse(response.content);
      console.log('✨ 解析结果:', result);

      return result;
    } catch (error) {
      console.error('LangChain 调用失败:', error);
      return {
        say: '抱歉，我现在有点问题...不过你可以直接告诉我想听什么歌',
        play: [],
        reason: 'LangChain调用失败: ' + error.message,
        segue: ''
      };
    }
  }

  /**
   * 构建用户输入
   */
  buildUserInput(context) {
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

    if (chatOnly) {
      message += `\n🚫 用户明确表示只想聊天，不想听音乐。play 字段必须是空数组 []\n`;
    }

    if (userInput) {
      message += `\n用户说: ${userInput}\n`;
    }

    message += `\n请严格按照JSON格式回复，必须包含 say, play, reason, segue 四个字段。`;

    return message;
  }

  /**
   * 解析响应
   */
  parseResponse(text) {
    try {
      console.log('🔍 原始响应:', text);

      if (!text || text.trim() === '') {
        console.error('❌ 返回空响应');
        return {
          say: '抱歉，我现在有点忙，稍后再聊吧',
          play: [],
          reason: '返回空响应',
          segue: ''
        };
      }

      // 尝试提取 JSON（可能被包裹在其他文本中）
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ 未找到 JSON 格式');
        return {
          say: '抱歉，我遇到了一些问题...不过我可以帮你搜索音乐，告诉我你想听什么吧',
          play: [],
          reason: '未找到 JSON 格式',
          segue: ''
        };
      }

      const jsonText = jsonMatch[0];
      console.log('📝 提取的 JSON:', jsonText);

      const parsed = JSON.parse(jsonText);
      console.log('✅ JSON解析成功:', parsed);

      // 验证必需字段
      if (!parsed.say || !parsed.play || !parsed.reason) {
        console.error('❌ JSON 缺少必需字段');
        return {
          say: parsed.say || '来听听这首歌吧',
          play: Array.isArray(parsed.play) ? parsed.play : [],
          reason: parsed.reason || '用户请求',
          segue: parsed.segue || ''
        };
      }

      return {
        say: parsed.say,
        play: Array.isArray(parsed.play) ? parsed.play : [],
        reason: parsed.reason,
        segue: parsed.segue || ''
      };
    } catch (error) {
      console.error('❌ 解析响应失败:', error);
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
   * 分析用户习惯
   */
  analyzeUserHabits() {
    if (!this.stateManager) return '';

    const playHistory = this.stateManager.getPlayHistory(50);
    if (!playHistory || playHistory.length === 0) {
      return '';
    }

    // 统计艺术家频率
    const artistCount = {};
    playHistory.forEach(item => {
      if (item.artist) {
        artistCount[item.artist] = (artistCount[item.artist] || 0) + 1;
      }
    });

    // 找出最喜欢的艺术家
    const topArtists = Object.entries(artistCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => `${artist}(${count}次)`)
      .join('、');

    return `\n## 用户最常听的艺术家\n${topArtists || '暂无数据'}\n`;
  }

  /**
   * 分析用户偏好
   */
  analyzeUserPreferences() {
    if (!this.stateManager) return '';

    const likedSongs = this.stateManager.getLikedSongs();
    const dislikedSongs = this.stateManager.getDislikedSongs();

    let analysis = '\n## 用户真实偏好\n';

    if (likedSongs.length > 0) {
      const topLiked = likedSongs.slice(0, 5);
      analysis += '### 喜欢的歌曲\n';
      analysis += topLiked.map(song => `- ${song.songName} - ${song.artist}`).join('\n');
      analysis += '\n\n';
    }

    if (dislikedSongs.length > 0) {
      const topDisliked = dislikedSongs.slice(0, 5);
      analysis += '### 不喜欢的歌曲（避免推荐）\n';
      analysis += topDisliked.map(song => `- ${song.songName} - ${song.artist}`).join('\n');
      analysis += '\n';
    }

    return analysis;
  }

  /**
   * 加载音乐库
   */
  async loadMusicLibrary() {
    try {
      const libraryPath = 'user/my-music-library.json';
      const data = await fs.readFile(libraryPath, 'utf-8');
      const library = JSON.parse(data);

      let analysis = '### 用户的网易云音乐库\n\n';
      analysis += `总歌曲数: ${musicVectorStore.getStats().totalSongs} 首\n\n`;

      if (library.topSongs && library.topSongs.length > 0) {
        analysis += '#### 最常听的歌曲（前20）\n';
        const top20 = library.topSongs.slice(0, 20);
        analysis += top20.map((song, index) =>
          `${index + 1}. ${song.name} - ${song.artist}`
        ).join('\n');
        analysis += '\n\n';
      }

      if (library.likedSongs && library.likedSongs.length > 0) {
        analysis += '#### 喜欢的音乐（红心歌曲前30）\n';
        const top30 = library.likedSongs.slice(0, 30);
        analysis += top30.map(song => `- ${song.name} - ${song.artist}`).join('\n');
        analysis += '\n\n';
      }

      analysis += `**重要提示**：
- 这是用户在网易云音乐的真实听歌数据，可以作为参考
- 用户的听歌排行反映了真实偏好，可以用来理解用户品味
- **但是！音乐库只是参考，不要局限于此**
- **70% 的推荐应该来自网易云搜索的新歌（探索模式）**
- **30% 的推荐可以从音乐库选择（舒适区模式）**`;

      return analysis;
    } catch (error) {
      return '### 用户的网易云音乐库\n\n暂未导入。';
    }
  }

  /**
   * 清除对话记忆
   */
  async clearMemory() {
    this.chatHistory = [];
    console.log('✅ 对话记忆已清除');
  }

  /**
   * 获取对话历史
   */
  async getMemory() {
    return { chat_history: this.chatHistory };
  }
}

export default LangChainAdapter;
