// 最终VIP播放验证测试
import dotenv from 'dotenv';
import { NeteaseCloudMusic } from './src/music/ncm.js';
import fetch from 'node-fetch';

dotenv.config();

console.log(`
╔════════════════════════════════════════╗
║   🎉 VIP歌曲完整播放验证测试         ║
╚════════════════════════════════════════╝
`);

async function finalTest() {
  const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);

  console.log('━'.repeat(60));
  console.log('步骤1: 验证Cookie配置');
  console.log('━'.repeat(60));

  const isValid = await ncm.validateCookie();

  if (!isValid) {
    console.log('\n❌ Cookie验证失败，无法继续测试');
    return;
  }

  console.log('\n');
  console.log('━'.repeat(60));
  console.log('步骤2: 测试VIP歌曲完整播放');
  console.log('━'.repeat(60));

  // 测试几首已知的VIP歌曲
  const testSongs = [
    { name: '天天', artist: '陶喆', id: 150633 },
    { name: '爱很简单', artist: '陶喆', id: 150421 },
    { name: '普通朋友', artist: '陶喆', id: 150422 }
  ];

  let successCount = 0;
  let fullVersionCount = 0;

  for (const song of testSongs) {
    console.log(`\n🎵 测试: ${song.name} - ${song.artist}`);

    const url = await ncm.getSongUrl(song.id);

    if (url) {
      successCount++;

      // 检查是否为完整版本（通过API再次验证）
      const checkUrl = `http://localhost:3000/song/url/v1?id=${song.id}&level=standard&cookie=${encodeURIComponent(process.env.NCM_COOKIE)}`;
      const response = await fetch(checkUrl);
      const data = await response.json();

      if (data.data && data.data[0]) {
        const songData = data.data[0];
        const isTrial = songData.freeTrialInfo && songData.freeTrialInfo.end > 0;
        const isPayed = songData.payed === 1;

        if (isPayed && !isTrial) {
          fullVersionCount++;
          console.log(`   ✅ 完整版本 - 可完整播放`);
          console.log(`   📊 大小: ${(songData.size / 1024 / 1024).toFixed(2)}MB, 码率: ${songData.br}`);
        } else if (isTrial) {
          console.log(`   ⚠️ 试听版本 - 仅${songData.freeTrialInfo.end/1000}秒`);
        } else {
          console.log(`   ⚠️ 未付费`);
        }
      }
    } else {
      console.log(`   ❌ 获取失败`);
    }
  }

  console.log('\n');
  console.log('━'.repeat(60));
  console.log('测试结果汇总');
  console.log('━'.repeat(60));
  console.log(`总测试歌曲: ${testSongs.length}`);
  console.log(`成功获取URL: ${successCount}`);
  console.log(`完整版本: ${fullVersionCount}`);
  console.log(`成功率: ${(successCount / testSongs.length * 100).toFixed(0)}%`);
  console.log(`完整版率: ${(fullVersionCount / testSongs.length * 100).toFixed(0)}%`);

  console.log('\n');
  if (fullVersionCount === testSongs.length) {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🎉 完美！所有VIP歌曲都可完整播放   ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n✅ VIP Cookie配置正确');
    console.log('✅ 网易云API工作正常');
    console.log('✅ 可以开始使用AI DJ了！');
  } else if (fullVersionCount > 0) {
    console.log('⚠️ 部分VIP歌曲可以完整播放');
    console.log('💡 可能原因: 部分歌曲版权限制或Cookie权限不足');
  } else {
    console.log('❌ VIP歌曲无法完整播放');
    console.log('💡 请检查:');
    console.log('   1. Cookie是否来自有效的VIP账号');
    console.log('   2. VIP是否已过期');
    console.log('   3. 网易云API服务是否正常运行');
  }

  console.log('\n');
  console.log('━'.repeat(60));
  console.log('下一步');
  console.log('━'.repeat(60));
  console.log('1. 启动AI DJ服务: npm start');
  console.log('2. 访问: http://localhost:8080');
  console.log('3. 开始享受你的专属AI DJ！');
  console.log('');
}

finalTest().catch(error => {
  console.error('测试失败:', error);
});
