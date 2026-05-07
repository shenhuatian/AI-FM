// 路由分流器 - 意图识别和分流
export class Router {
  constructor(deepseek, ncm, userProfile = null) {
    this.deepseek = deepseek;
    this.ncm = ncm;
    this.userProfile = userProfile;  // 🔥 添加用户画像
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

    // 🔥 新增：检测是否是对上一轮推荐的反馈
    const isFeedback = this.isFeedbackOnPreviousRecommendation(input, conversationHistory);
    if (isFeedback) {
      console.log('🎯 识别为对上一轮推荐的反馈，需要AI理解上下文');
      return await this.handleNaturalLanguage(input, context, conversationHistory);
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
   * 🔥 新增：检测是否是对上一轮推荐的反馈
   * @param {string} input - 用户输入
   * @param {Array} conversationHistory - 对话历史
   * @returns {boolean}
   */
  isFeedbackOnPreviousRecommendation(input, conversationHistory) {
    // 如果没有对话历史，肯定不是反馈
    if (!conversationHistory || conversationHistory.length === 0) {
      return false;
    }

    const lowerInput = input.toLowerCase().trim();

    // 🔥 新增：检测"解释性描述"（用户在解释上一首歌，不是请求）
    const explanationPatterns = [
      /^是.+的/, // "是陶喆的"、"是一首"
      /^这是/, // "这是一首"
      /^那是/, // "那是一首"
      /等.+演唱/, // "等一众歌星共同演唱"
      /等.+合唱/, // "等人合唱"
      /共同演唱/, // "共同演唱的"
      /一众/, // "一众歌星"
    ];

    // 如果是解释性描述，很可能是反馈
    if (explanationPatterns.some(pattern => pattern.test(lowerInput))) {
      console.log('🎯 检测到解释性描述，判定为反馈');
      return true;
    }

    // 反馈关键词
    const feedbackKeywords = [
      '这些', '这首', '这个', '太', '不够', '还要', '换',
      '不是', '不对', '不太', '有点', '稍微', '更',
      '别的', '其他', '再来', '还有', '继续', '算了'
    ];

    // 否定/调整关键词
    const adjustmentKeywords = [
      '热门', '冷门', '小众', '大众', '快', '慢',
      '新', '老', '经典', '流行', '深度', '浅'
    ];

    // 如果包含反馈关键词 + 调整关键词，很可能是反馈
    const hasFeedback = feedbackKeywords.some(k => lowerInput.includes(k));
    const hasAdjustment = adjustmentKeywords.some(k => lowerInput.includes(k));

    if (hasFeedback || hasAdjustment) {
      return true;
    }

    // 如果消息很短（<15字）且包含"听"、"要"、"来"等词，可能是延续对话
    if (lowerInput.length < 15 && (lowerInput.includes('听') || lowerInput.includes('要') || lowerInput.includes('来'))) {
      return true;
    }

    return false;
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
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>}
   */
  async handleMusicSearch(input, context, conversationHistory = []) {
    try {
      console.log(`\n🎵 处理音乐搜索: "${input}"`);

      // 🔥 新流程：意图分析 → 构建候选池 → AI 筛选 → 返回结果

      // 1. 意图分析
      console.log(`\n📊 步骤 1: 意图分析`);
      const intent = await this.deepseek.analyzeIntent(input, conversationHistory);
      console.log(`   意图:`, JSON.stringify(intent, null, 2));

      // 2. 根据意图构建候选池（智能混合推荐）
      console.log(`\n🎯 步骤 2: 构建候选池`);
      const lastPlayedSongId = context.lastPlayedSongId || null;
      const candidates = await this.ncm.getCandidatesByIntent(intent, null, lastPlayedSongId, 80);

      if (candidates.length === 0) {
        return {
          type: 'music',
          say: '抱歉，没有找到符合的歌曲',
          play: [],
          reason: '搜索无结果'
        };
      }

      console.log(`   候选歌曲数: ${candidates.length}`);

      // 3. AI 筛选歌曲（根据即时需求）
      console.log(`\n🧠 步骤 3: AI 筛选歌曲`);
      const filtered = await this.deepseek.filterSongs(candidates, intent, intent.count || 5);

      if (filtered.length === 0) {
        return {
          type: 'music',
          say: '抱歉，没有找到符合的歌曲',
          play: [],
          reason: '过滤后无结果'
        };
      }

      console.log(`   过滤后歌曲数: ${filtered.length}`);

      // 4. 获取播放 URL
      console.log(`\n🔗 步骤 4: 获取播放 URL`);
      const songsWithUrl = [];

      for (const song of filtered) {
        // 如果已经有 URL，跳过
        if (song.url) {
          songsWithUrl.push(song);
          continue;
        }

        // 获取播放 URL
        const url = await this.ncm.getSongUrl(song.id, 'standard');

        if (url) {
          song.url = url;
          songsWithUrl.push(song);
        } else {
          console.log(`   ⚠️ 无法获取播放链接: ${song.name} - ${song.artist}`);
        }

        // 如果已经有足够的歌曲，停止
        if (songsWithUrl.length >= (intent.count || 5)) {
          break;
        }
      }

      if (songsWithUrl.length === 0) {
        return {
          type: 'music',
          say: '抱歉，这些歌曲暂时无法播放',
          play: [],
          reason: '无法获取播放链接'
        };
      }

      console.log(`   可播放歌曲数: ${songsWithUrl.length}`);

      // 5. 生成自然的回复
      console.log(`\n💬 步骤 5: 生成回复`);
      const reply = await this.deepseek.generateReply(input, songsWithUrl, intent);

      // 🔥 步骤 6: 从对话中学习用户偏好
      if (this.userProfile) {
        console.log(`\n📝 步骤 6: 学习用户偏好`);
        this.userProfile.learnFromConversation(input, intent);
      }

      return {
        type: 'music',
        say: reply.say,
        play: songsWithUrl.map(s => `${s.name} - ${s.artist}`),
        songs: songsWithUrl,
        reason: reply.reason,
        intent: intent // 返回意图，用于调试
      };
    } catch (error) {
      console.error('❌ 处理音乐搜索失败:', error);

      // 降级：使用简单搜索
      console.log('⚠️ 降级到简单搜索');
      return await this.handleSimpleMusicSearch(input, context);
    }
  }

  /**
   * 🔥 新增：简单音乐搜索（降级方案）
   * @param {string} input - 用户输入
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async handleSimpleMusicSearch(input, context) {
    // 提取歌曲名或歌手名
    const keyword = this.extractMusicKeyword(input);

    if (!keyword) {
      return {
        type: 'music',
        say: '抱歉，我没有理解你想听什么歌',
        play: [],
        reason: '无法提取关键词'
      };
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

    // 获取播放 URL
    const songsWithUrl = [];
    for (const song of songs) {
      const url = await this.ncm.getSongUrl(song.id, 'standard');
      if (url) {
        song.url = url;
        songsWithUrl.push(song);
      }
    }

    return {
      type: 'music',
      say: `为你找到了"${keyword}"`,
      play: songsWithUrl.map(s => `${s.name} - ${s.artist}`),
      songs: songsWithUrl,
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
