// VIP歌曲测试脚本
import dotenv from 'dotenv';
import { NeteaseCloudMusic } from './src/music/ncm.js';

dotenv.config();

console.log(`
╔════════════════════════════════════════╗
║      🎵 VIP歌曲推荐测试              ║
╚════════════════════════════════════════╝
`);

async function testVIPHandling() {
  const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);

  console.log('📋 测试场景：搜索陶喆的歌曲');
  console.log('━'.repeat(50));

  // 测试1: 搜索陶喆的歌
  console.log('\n🔍 测试1: 搜索"天天 - 陶喆"');
  const song1 = await ncm.findSong('天天', '陶喆');

  if (song1) {
    console.log(`\n✅ 推荐结果:`);
    console.log(`   歌名: ${song1.name}`);
    console.log(`   艺术家: ${song1.artist}`);
    console.log(`   VIP状态: ${song1.vip ? '❌ VIP歌曲（可能只能播30秒）' : '✅ 非VIP（可完整播放）'}`);
    console.log(`   播放链接: ${song1.url ? '✅ 有效' : '❌ 无效'}`);
  } else {
    console.log('❌ 未找到歌曲');
  }

  // 测试2: 搜索爱很简单
  console.log('\n━'.repeat(50));
  console.log('\n🔍 测试2: 搜索"爱很简单 - 陶喆"');
  const song2 = await ncm.findSong('爱很简单', '陶喆');

  if (song2) {
    console.log(`\n✅ 推荐结果:`);
    console.log(`   歌名: ${song2.name}`);
    console.log(`   艺术家: ${song2.artist}`);
    console.log(`   VIP状态: ${song2.vip ? '❌ VIP歌曲（可能只能播30秒）' : '✅ 非VIP（可完整播放）'}`);
    console.log(`   播放链接: ${song2.url ? '✅ 有效' : '❌ 无效'}`);
  } else {
    console.log('❌ 未找到歌曲');
  }

  // 测试3: 搜索周杰伦的歌
  console.log('\n━'.repeat(50));
  console.log('\n🔍 测试3: 搜索"晴天 - 周杰伦"');
  const song3 = await ncm.findSong('晴天', '周杰伦');

  if (song3) {
    console.log(`\n✅ 推荐结果:`);
    console.log(`   歌名: ${song3.name}`);
    console.log(`   艺术家: ${song3.artist}`);
    console.log(`   VIP状态: ${song3.vip ? '❌ VIP歌曲（可能只能播30秒）' : '✅ 非VIP（可完整播放）'}`);
    console.log(`   播放链接: ${song3.url ? '✅ 有效' : '❌ 无效'}`);
  } else {
    console.log('❌ 未找到歌曲');
  }

  console.log(`
╔════════════════════════════════════════╗
║      📊 测试总结                      ║
╚════════════════════════════════════════╝

🎯 优化效果:
- 系统现在会优先推荐非VIP歌曲
- 非VIP歌曲可以完整播放
- VIP歌曲会被标记并降低优先级

💡 建议:
${song1?.vip || song2?.vip || song3?.vip ?
`- 如果你有VIP账号，更新Cookie可以播放VIP歌曲
- 查看 VIP音乐解决方案.md 了解如何获取Cookie` :
`- 当前推荐的都是非VIP歌曲，可以正常播放！`}

🚀 下一步:
1. 运行 npm start 启动服务
2. 访问 http://localhost:8080
3. 测试播放功能
  `);
}

testVIPHandling().catch(error => {
  console.error('测试失败:', error);
});
