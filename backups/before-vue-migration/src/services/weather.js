// OpenWeather API 服务
import fetch from 'node-fetch';

export class WeatherService {
  constructor(apiKey, city = 'Beijing') {
    this.apiKey = apiKey;
    this.city = city;
    this.cache = null;
    this.cacheTime = 0;
    this.cacheDuration = 30 * 60 * 1000; // 30分钟缓存
  }

  /**
   * 获取当前天气
   * @returns {Promise<Object|null>}
   */
  async getCurrentWeather() {
    // 检查缓存
    if (this.cache && Date.now() - this.cacheTime < this.cacheDuration) {
      return this.cache;
    }

    if (!this.apiKey) {
      // 静默返回null，不打印警告
      return null;
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${this.city}&appid=${this.apiKey}&units=metric&lang=zh_cn`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ OpenWeather API Key无效或未激活（新注册需等待2小时）');
        } else {
          console.warn(`⚠️ 天气API错误: ${response.status}`);
        }
        return null;
      }

      const data = await response.json();

      const weather = {
        condition: data.weather[0].description,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        icon: data.weather[0].icon
      };

      // 更新缓存
      this.cache = weather;
      this.cacheTime = Date.now();

      console.log(`✅ 天气获取成功: ${weather.condition}, ${weather.temperature}°C`);
      return weather;
    } catch (error) {
      // 静默处理错误，不影响主流程
      return null;
    }
  }

  /**
   * 设置城市
   * @param {string} city - 城市名称
   */
  setCity(city) {
    this.city = city;
    this.cache = null; // 清除缓存
  }
}

export default WeatherService;
