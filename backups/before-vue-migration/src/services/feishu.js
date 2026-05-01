// 飞书日程服务
import fetch from 'node-fetch';

export class FeishuCalendarService {
  constructor(appId, appSecret) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 获取访问令牌
   * @returns {Promise<string>}
   */
  async getAccessToken() {
    // 检查token是否过期
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    if (!this.appId || !this.appSecret) {
      console.warn('⚠️ 未配置飞书API');
      return null;
    }

    try {
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret
        })
      });

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(`飞书API错误: ${data.msg}`);
      }

      this.accessToken = data.tenant_access_token;
      this.tokenExpireTime = Date.now() + (data.expire - 60) * 1000; // 提前1分钟过期

      return this.accessToken;
    } catch (error) {
      console.error('获取飞书token失败:', error);
      return null;
    }
  }

  /**
   * 获取今日日程
   * @returns {Promise<Array>}
   */
  async getTodayEvents() {
    const token = await this.getAccessToken();
    if (!token) {
      return [];
    }

    try {
      const today = new Date();
      const startTime = new Date(today.setHours(0, 0, 0, 0)).getTime();
      const endTime = new Date(today.setHours(23, 59, 59, 999)).getTime();

      const response = await fetch(
        `https://open.feishu.cn/open-apis/calendar/v4/calendars/primary/events?start_time=${startTime}&end_time=${endTime}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(`飞书API错误: ${data.msg}`);
      }

      return data.data.items.map(event => ({
        id: event.event_id,
        summary: event.summary,
        startTime: new Date(event.start.timestamp * 1000),
        endTime: new Date(event.end.timestamp * 1000),
        location: event.location?.name || ''
      }));
    } catch (error) {
      console.error('获取飞书日程失败:', error);
      return [];
    }
  }

  /**
   * 获取即将开始的日程
   * @param {number} minutes - 未来多少分钟内
   * @returns {Promise<Array>}
   */
  async getUpcomingEvents(minutes = 60) {
    const events = await this.getTodayEvents();
    const now = Date.now();
    const futureTime = now + minutes * 60 * 1000;

    return events.filter(event => {
      const startTime = event.startTime.getTime();
      return startTime > now && startTime < futureTime;
    });
  }
}

export default FeishuCalendarService;
