// 定时调度系统
export class Scheduler {
  constructor(brain, ncm, state) {
    this.brain = brain;
    this.ncm = ncm;
    this.state = state;
    this.timers = [];
  }

  /**
   * 启动调度器
   */
  start() {
    console.log('⏰ 调度系统已启动');

    // 晨起音乐 - 每天7:00
    this.scheduleDaily('07:00', async () => {
      console.log('🌅 晨起音乐时间');
      await this.morningRoutine();
    });

    // 早间音乐 - 每天9:00
    this.scheduleDaily('09:00', async () => {
      console.log('☕ 早间音乐时间');
      await this.workRoutine();
    });

    // 每小时检查
    this.scheduleHourly(async () => {
      console.log('🔧 每小时检查');
      await this.hourlyCheck();
    });
  }

  /**
   * 晨起音乐流程
   */
  async morningRoutine() {
    try {
      const context = {
        time: new Date().toLocaleString('zh-CN'),
        userInput: '早上好，来点适合晨起的音乐',
        playHistory: this.state.getPlayHistory(10)
      };

      const decision = await this.brain.decide(context);

      // 搜索并记录歌曲
      for (const playItem of decision.play) {
        const [songName, artistName] = playItem.split(' - ').map(s => s.trim());
        const song = await this.ncm.findSong(songName, artistName);
        if (song) {
          await this.state.addPlay(song, {
            reason: decision.reason,
            scheduled: 'morning'
          });
          console.log(`🎵 已添加: ${song.name} - ${song.artist}`);
        }
      }
    } catch (error) {
      console.error('晨起音乐流程失败:', error);
    }
  }

  /**
   * 工作音乐流程
   */
  async workRoutine() {
    try {
      const context = {
        time: new Date().toLocaleString('zh-CN'),
        userInput: '工作时间，来点专注的音乐',
        playHistory: this.state.getPlayHistory(10)
      };

      const decision = await this.brain.decide(context);

      for (const playItem of decision.play) {
        const [songName, artistName] = playItem.split(' - ').map(s => s.trim());
        const song = await this.ncm.findSong(songName, artistName);
        if (song) {
          await this.state.addPlay(song, {
            reason: decision.reason,
            scheduled: 'work'
          });
          console.log(`🎵 已添加: ${song.name} - ${song.artist}`);
        }
      }
    } catch (error) {
      console.error('工作音乐流程失败:', error);
    }
  }

  /**
   * 每小时检查
   */
  async hourlyCheck() {
    try {
      const recentPlays = this.state.getPlayHistory(5);
      if (recentPlays.length === 0) {
        console.log('暂无播放记录，跳过检查');
        return;
      }

      const lastPlayTime = new Date(recentPlays[0].played_at).getTime();
      const timeSinceLastPlay = Date.now() - lastPlayTime;
      const oneHour = 60 * 60 * 1000;

      if (timeSinceLastPlay > oneHour) {
        console.log('距离上次播放超过1小时，推荐新歌');
        await this.workRoutine();
      }
    } catch (error) {
      console.error('每小时检查失败:', error);
    }
  }

  /**
   * 每天定时任务
   * @param {string} time - 时间 (HH:MM)
   * @param {Function} callback - 回调函数
   */
  scheduleDaily(time, callback) {
    const [hours, minutes] = time.split(':').map(Number);

    const schedule = () => {
      const now = new Date();
      const scheduled = new Date();
      scheduled.setHours(hours, minutes, 0, 0);

      if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 1);
      }

      const delay = scheduled - now;

      const timer = setTimeout(() => {
        callback();
        schedule();
      }, delay);

      this.timers.push(timer);
    };

    schedule();
  }

  /**
   * 每小时任务
   * @param {Function} callback - 回调函数
   */
  scheduleHourly(callback) {
    const schedule = () => {
      const now = new Date();
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

      const delay = nextHour - now;

      const timer = setTimeout(() => {
        callback();
        schedule();
      }, delay);

      this.timers.push(timer);
    };

    schedule();
  }

  /**
   * 停止所有定时任务
   */
  stop() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
    console.log('⏰ 调度系统已停止');
  }
}

export default Scheduler;
