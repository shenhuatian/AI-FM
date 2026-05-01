// 完整功能测试脚本
import dotenv from 'dotenv';
import { NeteaseCloudMusic } from './src/music/ncm.js';
import { DeepSeekAdapter } from './src/brain/deepseek.js';
import { StateManager } from './src/brain/state.js';
import { ContextBuilder } from './src/brain/context.js';

dotenv.config();

console.log(`
╔════════════════════════════════════════╗
║      🧪 AI DJ 完整功能测试           ║
╚════════════════════════════════════════╝
`);

async function testNCM() {
  console.log('\n📦 测试1: 网易云音乐API');
  console.log('━'.repeat(50));

  const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);

  // 验证Cookie
  console.log('\n1️⃣ 验证Cookie...');
  const isValid = await ncm.validateCookie();
  if (!isValid) {
    console.log('⚠️ Cookie可能无效，但继续测试...');
  }

  // 测试搜索
  console.log('\n2️⃣ 测试搜索功能...');
  const song1 = await ncm.findSong('晴天', '周杰伦');
  if (song1) {
    console.log(`✅ 找到歌曲: ${song1.name} - ${song1.artist}`);
    console.log(`   播放链接: ${song1.url ? '✅ 有效' : '❌ 无效'}`);
  } else {
    console.log('❌ 搜索失败');
  }

  // 测试陶喆的歌
  console.log('\n3️⃣ 测试用户喜欢的艺术家（陶喆）...');
  const song2 = await ncm.findSong('爱很简单', '陶喆');
  if (song2) {
    console.log(`✅ 找到歌曲: ${song2.name} - ${song2.artist}`);
    console.log(`   播放链接: ${song2.url ? '✅ 有效' : '❌ 无效'}`);
  } else {
    console.log('❌ 搜索失败');
  }

  return { song1, song2 };
}

async function testDeepSeek() {
  console.log('\n📦 测试2: DeepSeek AI大脑');
  console.log('━'.repeat(50));

  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('❌ 未配置DEEPSEEK_API_KEY，跳过测试');
    return null;
  }

  const deepseek = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY);
  const state = new StateManager('data');
  await state.init();

  const contextBuilder = new ContextBuilder(state);
  const context = await contextBuilder.build({
    userInput: '我今天心情不错，推荐点轻快的歌'
  });

  console.log('\n1️⃣ 构建上下文...');
  console.log(`   时间: ${context.time}`);
  console.log(`   用户输入: ${context.userInput}`);

  console.log('\n2️⃣ 调用DeepSeek...');
  try {
    const decision = await deepseek.decide(context);
    console.log(`✅ AI回复: ${decision.say}`);
    console.log(`   推荐歌曲: ${decision.play.join(', ')}`);
    console.log(`   推荐理由: ${decision.reason}`);
    return decision;
  } catch (error) {
    console.log(`❌ DeepSeek调用失败: ${error.message}`);
    return null;
  }
}

async function testStateManager() {
  console.log('\n📦 测试3: 状态管理与学习');
  console.log('━'.repeat(50));

  const state = new StateManager('data');
  await state.init();

  console.log('\n1️⃣ 模拟播放记录...');
  await state.addPlay({
    id: '123',
    name: '晴天',
    artist: '周杰伦',
    album: '叶惠美'
  }, { reason: '测试' });

  console.log('✅ 播放记录已保存');

  console.log('\n2️⃣ 获取用户偏好...');
  const favorites = state.getFavoriteArtists(5);
  console.log(`   最喜欢的艺术家: ${favorites.map(f => `${f.artist}(${f.count}次)`).join(', ')}`);

  console.log('\n3️⃣ 获取推荐权重...');
  const weights = state.getRecommendationWeights();
  console.log(`   当前时间段: ${weights.currentTimeSlot}`);
  console.log(`   最近播放: ${weights.recentPlays.length}首`);

  return state;
}

async function testIntegration(songs) {
  console.log('\n📦 测试4: 完整流程集成');
  console.log('━'.repeat(50));

  if (!songs.song1) {
    console.log('⚠️ 跳过集成测试（没有可用歌曲）');
    return;
  }

  console.log('\n1️⃣ 模拟用户请求...');
  console.log('   用户: "播放周杰伦的晴天"');

  console.log('\n2️⃣ AI处理...');
  console.log(`   ✅ 找到歌曲: ${songs.song1.name} - ${songs.song1.artist}`);
  console.log(`   ✅ 获取播放链接: ${songs.song1.url ? '成功' : '失败'}`);

  console.log('\n3️⃣ 保存播放记录...');
  const state = new StateManager('data');
  await state.init();
  await state.addPlay(songs.song1, { reason: '用户点播' });
  console.log('   ✅ 已保存到历史记录');

  console.log('\n4️⃣ 学习用户偏好...');
  const favorites = state.getFavoriteArtists(3);
  console.log(`   当前最喜欢: ${favorites.map(f => f.artist).join(', ')}`);
}

async function runAllTests() {
  try {
    // 测试1: 网易云音乐
    const songs = await testNCM();

    // 测试2: DeepSeek
    await testDeepSeek();

    // 测试3: 状态管理
    await testStateManager();

    // 测试4: 完整流程
    await testIntegration(songs);

    console.log(`
╔════════════════════════════════════════╗
║      ✅ 测试完成                      ║
╚════════════════════════════════════════╝

📝 测试总结:
1. 网易云音乐API: ${songs.song1 ? '✅ 正常' : '❌ 异常'}
2. DeepSeek AI: ${process.env.DEEPSEEK_API_KEY ? '✅ 已配置' : '⚠️ 未配置'}
3. 状态管理: ✅ 正常
4. 完整流程: ${songs.song1 ? '✅ 正常' : '⚠️ 部分功能受限'}

🚀 下一步:
${songs.song1 ? '- 运行 npm start 启动服务' : '- 检查网易云Cookie配置'}
- 访问 http://localhost:8080
- 开始与Claudio对话！
`);

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error);
    console.error(error.stack);
  }
}

runAllTests();
