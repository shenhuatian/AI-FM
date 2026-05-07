// 主动对话管理器 - 让AI DJ具有"自主意识"
export class ProactiveAgent {
  constructor(deepseek, state, contextBuilder, ncm) {
    this.deepseek = deepseek;
    this.state = state;
    this.contextBuilder = contextBuilder;
    this.ncm = ncm;
    this.lastProactiveTime = 0;
    this.lastProactiveMessage = null;
    this.userResponseRate = 1.0; // 用户响应率（1.0 = 100%）
    this.isRunning = false;
    this.checkInterval = null;
    this.broadcastCallback = null; // 广播回调函数
  }

  /**
   * 设置广播回调函数
   */
  setBroadcastCallback(callback) {
    this.broadcastCallback = callback;
    console.log('✅ 主动对话广播回调已设置');
  }

  /**
   * 启动主动对话系统
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ 主动对话系统已在运行');
      return;
    }

    this.isRunning = true;
    console.log('🤖 主动对话系统已启动');

    // 定期检查是否应该主动说话
    this.scheduleNextCheck();
  }

  /**
   * 停止主动对话系统
   */
  stop() {
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('🤖 主动对话系统已停止');
  }

  /**
   * 安排下一次检查
   */
  scheduleNextCheck() {
    if (!this.isRunning) return;

    // 根据用户设置和响应率动态调整间隔
    const settings = this.state.getProactiveSettings();
    let baseInterval = this.getBaseInterval(settings.level);

    // 如果用户经常忽略，增加间隔
    if (this.userResponseRate < 0.3) {
      baseInterval *= 2; // 响应率低于30%，间隔翻倍
    }

    // 添加随机性，避免过于机械（±20%）
    const randomFactor = 0.8 + Math.random() * 0.4;
    const actualInterval = baseInterval * randomFactor;

    console.log(`⏰ 下次主动检查将在 ${Math.round(actualInterval / 1000 / 60)} 分钟后`);

    this.checkInterval = setTimeout(async () => {
      // 如果设置了广播回调，使用回调函数
      if (this.broadcastCallback) {
        await this.broadcastCallback();
      } else {
        // 否则直接调用 checkAndSpeak
        await this.checkAndSpeak();
      }
      this.scheduleNextCheck();
    }, actualInterval);
  }

  /**
   * 获取基础间隔时间（毫秒）
   */
  getBaseInterval(level) {
    switch (level) {
      case 'quiet':
        return 30 * 60 * 1000; // 30分钟
      case 'active':
        return 5 * 60 * 1000; // 5分钟
      case 'medium':
      default:
        return 15 * 60 * 1000; // 15分钟
    }
  }

  /**
   * 检查并决定是否主动说话
   */
  async checkAndSpeak() {
    try {
      const settings = this.state.getProactiveSettings();

      // 如果用户关闭了主动对话
      if (settings.level === 'quiet') {
        console.log('🔇 用户设置为安静模式，跳过主动对话');
        return null;
      }

      // 检查是否在安静时段
      if (this.isQuietHours(settings.quietHours)) {
        console.log('🌙 当前是安静时段，跳过主动对话');
        return null;
      }

      // 检查触发条件
      const triggers = this.checkTriggers();
      if (triggers.length === 0) {
        console.log('📭 没有触发条件，跳过主动对话');
        return null;
      }

      console.log('🎯 触发条件:', triggers.map(t => t.type).join(', '));

      // 构建上下文
      const context = await this.contextBuilder.build();

      // 让AI判断是否应该说话
      const decision = await this.deepseek.decideProactive(context, triggers, this.lastProactiveMessage);

      if (decision.shouldSpeak) {
        console.log('💬 AI决定主动说话:', decision.message);
        this.lastProactiveTime = Date.now();
        this.lastProactiveMessage = decision.message;

        // 记录主动消息
        await this.state.addProactiveMessage(decision);

        return decision;
      } else {
        console.log('🤐 AI决定保持安静');
        return null;
      }
    } catch (error) {
      console.error('❌ 主动对话检查失败:', error);
      return null;
    }
  }

  /**
   * 检查触发条件
   */
  checkTriggers() {
    const triggers = [];
    const now = Date.now();

    // 1. 长时间未互动（30分钟）
    const lastMessage = this.state.getMessages(1)[0];
    if (lastMessage) {
      const lastMessageTime = lastMessage.created_at ? new Date(lastMessage.created_at).getTime() : 0;
      const idleTime = now - lastMessageTime;
      if (idleTime > 30 * 60 * 1000) {
        triggers.push({
          type: 'idle',
          duration: Math.round(idleTime / 60 / 1000),
          description: `用户已经${Math.round(idleTime / 60 / 1000)}分钟没有互动`
        });
      }
    }

    // 2. 特殊时刻（整点或半点）
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    if ([7, 9, 12, 14, 18, 21].includes(hour) && minute < 5) {
      triggers.push({
        type: 'special_time',
        hour,
        description: `特殊时刻：${hour}点`
      });
    }

    // 3. 播放列表即将结束
    const playHistory = this.state.getPlayHistory(5);
    if (playHistory.length > 0) {
      const lastPlay = playHistory[0];
      const timeSinceLastPlay = now - new Date(lastPlay.played_at).getTime();

      // 如果最后一首歌播放超过5分钟，可能播放列表已结束
      if (timeSinceLastPlay > 5 * 60 * 1000 && timeSinceLastPlay < 10 * 60 * 1000) {
        triggers.push({
          type: 'playlist_ending',
          description: '播放列表可能已结束'
        });
      }
    }

    // 4. 用户最近跳过多首歌
    const recentPlays = this.state.getPlayHistory(5);
    const skippedCount = recentPlays.filter(p => p.skipped).length;
    if (skippedCount >= 3) {
      triggers.push({
        type: 'multiple_skips',
        count: skippedCount,
        description: `用户最近跳过了${skippedCount}首歌`
      });
    }

    // 5. 天气变化（如果有天气服务）
    // 这个需要在 contextBuilder 中检测天气变化
    // 暂时跳过

    // 6. 用户刚上线（检测最近是否有活动）
    const recentMessages = this.state.getMessages(2);
    if (recentMessages.length > 0) {
      const lastUserMessage = recentMessages.find(m => m.role === 'user');
      if (lastUserMessage) {
        const lastUserMessageTime = lastUserMessage.created_at ? new Date(lastUserMessage.created_at).getTime() : 0;
        const timeSinceLastUserMessage = now - lastUserMessageTime;
        // 如果用户刚发过消息（5分钟内），但AI还没主动说话
        if (timeSinceLastUserMessage < 5 * 60 * 1000 && now - this.lastProactiveTime > 20 * 60 * 1000) {
          triggers.push({
            type: 'user_active',
            description: '用户刚刚活跃'
          });
        }
      }
    }

    return triggers;
  }

  /**
   * 检查是否在安静时段
   */
  isQuietHours(quietHours) {
    if (!quietHours || !quietHours.start || !quietHours.end) {
      return false;
    }

    const hour = new Date().getHours();
    const { start, end } = quietHours;

    // 处理跨天的情况（如 23:00 - 7:00）
    if (start > end) {
      return hour >= start || hour < end;
    } else {
      return hour >= start && hour < end;
    }
  }

  /**
   * 记录用户对主动消息的响应
   * @param {boolean} responded - 用户是否响应了
   */
  recordUserResponse(responded) {
    // 使用指数移动平均更新响应率
    const alpha = 0.3; // 平滑系数
    this.userResponseRate = alpha * (responded ? 1 : 0) + (1 - alpha) * this.userResponseRate;

    console.log(`📊 用户响应率: ${(this.userResponseRate * 100).toFixed(1)}%`);

    // 保存到状态
    this.state.updateProactiveStats({
      responseRate: this.userResponseRate,
      lastUpdate: Date.now()
    });
  }

  /**
   * 手动触发主动对话（用于测试或特殊场景）
   */
  async triggerManually(reason = 'manual') {
    console.log('🎯 手动触发主动对话:', reason);

    const context = await this.contextBuilder.build();
    const triggers = [{ type: 'manual', description: reason }];

    const decision = await this.deepseek.decideProactive(context, triggers, this.lastProactiveMessage);

    if (decision.shouldSpeak) {
      this.lastProactiveTime = Date.now();
      this.lastProactiveMessage = decision.message;
      await this.state.addProactiveMessage(decision);
      return decision;
    }

    return null;
  }
}

export default ProactiveAgent;
