// 测试API配置
import dotenv from 'dotenv';
import { NeteaseCloudMusic } from './src/music/ncm.js';
import { WeatherService } from './src/services/weather.js';
import { DeepSeekAdapter } from './src/brain/deepseek.js';

dotenv.config();

console.log('🧪 开始测试API配置...\n');

// 测试1：DeepSeek API
console.log('1️⃣ 测试 DeepSeek API');
if (process.env.DEEPSEEK_API_KEY) {
  console.log('✅ DeepSeek API Key 已配置');
  try {
    const deepseek = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY);
    console.log('✅ DeepSeek 适配器初始化成功');
  } catch (error) {
    console.log('❌ DeepSeek 适配器初始化失败:', error.message);
  }
} else {
  console.log('❌ DeepSeek API Key 未配置（必需）');
  console.log('   请在 .env 文件中配置 DEEPSEEK_API_KEY');
}

console.log('\n2️⃣ 测试网易云音乐API');
const ncm = new NeteaseCloudMusic();
console.log('尝试搜索歌曲: 晴天...');
try {
  const songs = await ncm.search('晴天', 3);
  if (songs.length > 0) {
    console.log(`✅ 搜索成功，找到 ${songs.length} 首歌曲:`);
    songs.forEach((song, i) => {
      console.log(`   ${i + 1}. ${song.name} - ${song.artist}`);
    });
  } else {
    console.log('⚠️ 搜索返回空结果');
    console.log('   建议：本地部署网易云音乐API');
    console.log('   git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git');
    console.log('   cd NeteaseCloudMusicApi && npm install && npm start');
  }
} catch (error) {
  console.log('❌ 搜索失败:', error.message);
}

console.log('\n3️⃣ 测试天气服务');
if (process.env.OPENWEATHER_API_KEY) {
  console.log('✅ OpenWeather API Key 已配置');
  const weather = new WeatherService(process.env.OPENWEATHER_API_KEY);
  try {
    const data = await weather.getCurrentWeather();
    if (data) {
      console.log(`✅ 天气获取成功: ${data.condition}, ${data.temperature}°C`);
    } else {
      console.log('⚠️ 天气获取失败（可能API Key未激活，需等待2小时）');
    }
  } catch (error) {
    console.log('❌ 天气服务错误:', error.message);
  }
} else {
  console.log('⚠️ OpenWeather API Key 未配置（可选）');
}

console.log('\n4️⃣ 测试Fish Audio');
if (process.env.FISH_API_KEY) {
  console.log('✅ Fish Audio API Key 已配置');
} else {
  console.log('⚠️ Fish Audio API Key 未配置（可选）');
}

console.log('\n5️⃣ 测试飞书API');
if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
  console.log('✅ 飞书 API 已配置');
} else {
  console.log('⚠️ 飞书 API 未配置（可选）');
}

console.log('\n📋 测试总结:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
const hasWeather = !!process.env.OPENWEATHER_API_KEY;
const hasFish = !!process.env.FISH_API_KEY;
const hasFeishu = !!(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET);

console.log(`DeepSeek (必需): ${hasDeepSeek ? '✅' : '❌'}`);
console.log(`网易云音乐: ✅ (无需配置)`);
console.log(`天气服务 (可选): ${hasWeather ? '✅' : '⚠️'}`);
console.log(`语音服务 (可选): ${hasFish ? '✅' : '⚠️'}`);
console.log(`日程服务 (可选): ${hasFeishu ? '✅' : '⚠️'}`);

if (hasDeepSeek) {
  console.log('\n✅ 最小配置已完成，可以启动服务！');
  console.log('   运行: npm start');
} else {
  console.log('\n❌ 缺少必需配置，请先配置 DeepSeek API Key');
  console.log('   1. 访问 https://platform.deepseek.com/');
  console.log('   2. 创建 API Key');
  console.log('   3. 在 .env 文件中配置 DEEPSEEK_API_KEY');
}

console.log('\n💡 提示: 查看 docs/API-GUIDE.md 获取详细配置说明');
