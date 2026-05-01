// DeepSeek API适配器
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

export class ClaudeAdapter {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com'
    });
  }

  /**
   * 调用DeepSeek进行DJ决策
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} DJ决策结果
   */
  async decide(context) {
    try {
      const systemPrompt = await this.buildSystemPrompt(context);
      const userMessage = this.buildUserMessage(context);

      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
      });

      // 解析DeepSeek的回复
      const content = response.choices[0].message.content;
      console.log('DeepSeek原始回复:', content);
      const result = this.parseResponse(content);
      console.log('解析后的结果:', result);
      return result;
    } catch (error) {
      console.error('DeepSeek API调用失败:', error);
      throw error;
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

    return `${djPersona}

## 用户音乐品味
${taste}

## 用户日常作息
${routines}

## 心情与音乐规则
${moodRules}

## 历史播放记录
${context.playHistory ? this.formatPlayHistory(context.playHistory) : '暂无历史记录'}
`;
  }

  /**
   * 构建用户消息
   * @param {Object} context - 上下文信息
   * @returns {string} 用户消息
   */
  buildUserMessage(context) {
    const { time, weather, userInput, mood } = context;

    let message = `当前时间: ${time}\n`;

    if (weather) {
      message += `天气: ${weather.condition}, ${weather.temperature}°C\n`;
    }

    if (mood) {
      message += `用户心情: ${mood}\n`;
    }

    if (userInput) {
      message += `\n用户说: ${userInput}\n`;
    } else {
      message += `\n请根据当前时间和场景，为用户推荐合适的音乐。\n`;
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
      // 尝试提取JSON
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                       text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        return {
          say: parsed.say || '',
          play: parsed.play || [],
          reason: parsed.reason || '',
          segue: parsed.segue || ''
        };
      }

      // 如果没有找到JSON，返回默认结构
      return {
        say: text,
        play: [],
        reason: '无法解析回复',
        segue: ''
      };
    } catch (error) {
      console.error('解析DeepSeek回复失败:', error);
      return {
        say: text,
        play: [],
        reason: '解析失败',
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

export default ClaudeAdapter;
