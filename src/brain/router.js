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
    // 🔥 新增：快速意图分类
    const intent = this.quickClassifyIntent(input);
    console.log(`🎯 意图识别结果: "${input}" -> ${intent}`);

    // 如果明确是纯聊天，不推荐音乐
    if (intent === 'definitely_chat') {
      console.log('✅ 识别为纯聊天意图，不推荐音乐');
      return await this.handlePureChat(input, context, conversationHistory);
    }

    // 检测简单指令
    const simpleCommand = this.detectSimpleCommand(input);
    if (simpleCommand) {
      return await this.handleSimpleCommand(simpleCommand, context);
    }

    // 如果明确是音乐请求
    if (intent === 'definitely_music' || this.isMusicSearch(input)) {
      console.log('🎯 识别为音乐请求意图');
      return await this.handleMusicSearch(input, context);
    }

    // 不确定的情况，走DeepSeek自然语言处理（AI会自己判断）
    console.log('🎯 意图不明确，交给AI判断');
    return await this.handleNaturalLanguage(input, context, conversationHistory);
  }

  /**
   * 🔥 新增：快速意图分类
   * @param {string} input - 用户输入
   * @returns {string} 'definitely_chat' | 'definitely_music' | 'uncertain'
   */
  quickClassifyIntent(input) {
    const lowerInput = input.toLowerCase().trim();

    // 纯聊天关键词（明确不想要音乐）
    const pureChatKeywords = [
      '聊天', '聊聊', '聊会', '说说话', '说说', '讲讲',
      '怎么样', '最近', '你好吗', '在干嘛', '干什么',
      '我今天', '我感觉', '我心情', '我觉得',
      '你觉得', '你认为', '你怎么看'
    ];

    // 明确拒绝音乐
    const rejectMusicKeywords = [
      '不想听', '别放', '不要音乐', '先不听', '暂时不要',
      '不用放', '别推荐', '不需要音乐'
    ];

    // 音乐请求关键词
    const musicKeywords = [
      '播放', '来一首', '来首', '听', '推荐', '放',
      '换首', '下一首', '上一首', '音乐', '歌',
      '有什么好听', '推荐点'
    ];

    // 场景关键词（通常需要音乐）
    const sceneKeywords = [
      '工作', '运动', '睡觉', '开车', '学习',
      '放松', '健身', '跑步'
    ];

    // 1. 明确拒绝音乐 -> 纯聊天
    if (rejectMusicKeywords.some(k => lowerInput.includes(k))) {
      return 'definitely_chat';
    }

    // 2. 纯聊天关键词 + 没有音乐关键词 -> 纯聊天
    const hasChatKeyword = pureChatKeywords.some(k => lowerInput.includes(k));
    const hasMusicKeyword = musicKeywords.some(k => lowerInput.includes(k));

    if (hasChatKeyword && !hasMusicKeyword) {
      return 'definitely_chat';
    }

    // 3. 明确的音乐请求
    if (hasMusicKeyword) {
      return 'definitely_music';
    }

    // 4. 场景关键词（可能需要音乐，但不确定）
    if (sceneKeywords.some(k => lowerInput.includes(k))) {
      return 'uncertain';
    }

    // 5. 短问候语（纯聊天）
    const greetings = ['你好', '嗨', 'hi', 'hello', '早', '晚上好', '下午好'];
    if (greetings.some(g => lowerInput === g || lowerInput.startsWith(g))) {
      return 'definitely_chat';
    }

    // 6. 默认不确定，让AI判断
    return 'uncertain';
  }

  /**
   * 🔥 新增：处理纯聊天（不推荐音乐）
   * @param {string} input - 用户输入
   * @param {Object} context - 上下文
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>}
   */
  async handlePureChat(input, context, conversationHistory = []) {
    const fullContext = {
      ...context,
      userInput: input,
      chatOnly: true  // 标记为纯聊天模式
    };

    const decision = await this.deepseek.decide(fullContext, conversationHistory);

    // 确保不返回音乐（双重保险）
    return {
      type: 'chat',
      say: decision.say,
      play: [],  // 强制清空音乐推荐
      reason: '',
      segue: ''
    };
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
