// 路由分流器 - 意图识别和分流
export class Router {
  constructor(deepseek, ncm) {
    this.deepseek = deepseek;
    this.ncm = ncm;
  }

  /**
   * 分析用户意图并路由到相应处理器
   * @param {string} input - 用户输入
   * @param {Object} context - 上下文信息
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} 处理结果
   */
  async route(input, context, conversationHistory = []) {
    // 检测简单指令
    const simpleCommand = this.detectSimpleCommand(input);
    if (simpleCommand) {
      return await this.handleSimpleCommand(simpleCommand, context);
    }

    // 检测音乐搜索意图
    if (this.isMusicSearch(input)) {
      return await this.handleMusicSearch(input, context);
    }

    // 默认走DeepSeek自然语言处理
    return await this.handleNaturalLanguage(input, context, conversationHistory);
  }

  /**
   * 检测简单指令
   * @param {string} input - 用户输入
   * @returns {string|null} 指令类型
   */
  detectSimpleCommand(input) {
    const commands = {
      '下一首': 'next',
      '随机': 'random',
      '暂停': 'pause',
      '播放': 'play',
      '停止': 'stop'
    };

    for (const [keyword, command] of Object.entries(commands)) {
      if (input.includes(keyword)) {
        return command;
      }
    }

    return null;
  }

  /**
   * 检测是否为音乐搜索意图
   * @param {string} input - 用户输入
   * @returns {boolean}
   */
  isMusicSearch(input) {
    const searchKeywords = ['搜索', '找', '播放', '来一首', '听'];
    return searchKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * 处理简单指令
   * @param {string} command - 指令类型
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async handleSimpleCommand(command, context) {
    switch (command) {
      case 'next':
        return {
          type: 'command',
          action: 'next',
          say: '好的，为你切换下一首'
        };

      case 'random':
        return {
          type: 'command',
          action: 'random',
          say: '随机模式已开启'
        };

      case 'pause':
        return {
          type: 'command',
          action: 'pause',
          say: '已暂停'
        };

      case 'play':
        return {
          type: 'command',
          action: 'play',
          say: '继续播放'
        };

      case 'stop':
        return {
          type: 'command',
          action: 'stop',
          say: '已停止'
        };

      default:
        return await this.handleNaturalLanguage(command, context);
    }
  }

  /**
   * 处理音乐搜索
   * @param {string} input - 用户输入
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async handleMusicSearch(input, context) {
    // 提取歌曲名或歌手名
    const keyword = this.extractMusicKeyword(input);

    if (!keyword) {
      // 如果无法提取关键词，走自然语言处理
      return await this.handleNaturalLanguage(input, context);
    }

    // 直接搜索音乐
    const songs = await this.ncm.search(keyword, 5);

    if (songs.length === 0) {
      return {
        type: 'music',
        say: `抱歉，没有找到"${keyword}"相关的歌曲`,
        play: [],
        reason: '搜索无结果'
      };
    }

    return {
      type: 'music',
      say: `为你找到了"${keyword}"`,
      play: songs.map(s => `${s.name} - ${s.artist}`),
      songs: songs,
      reason: '直接搜索'
    };
  }

  /**
   * 提取音乐关键词
   * @param {string} input - 用户输入
   * @returns {string|null}
   */
  extractMusicKeyword(input) {
    // 移除常见的搜索词
    let keyword = input
      .replace(/搜索|找|播放|来一首|听|我想|帮我/g, '')
      .trim();

    return keyword || null;
  }

  /**
   * 处理自然语言（走DeepSeek）
   * @param {string} input - 用户输入
   * @param {Object} context - 上下文
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>}
   */
  async handleNaturalLanguage(input, context, conversationHistory = []) {
    const fullContext = {
      ...context,
      userInput: input
    };

    const decision = await this.deepseek.decide(fullContext, conversationHistory);

    return {
      type: 'ai',
      ...decision
    };
  }
}

export default Router;
