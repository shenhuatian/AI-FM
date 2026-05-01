// 测试优化后的搜索
import { NeteaseCloudMusic } from './src/music/ncm.js';
import dotenv from 'dotenv';

dotenv.config();

const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);

async function testSearch() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   测试优化后的搜索算法                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const testCases = [
    { song: '爱很简单', artist: '陶喆' },
    { song: '晴天', artist: '周杰伦' },
    { song: '稻香', artist: '周杰伦' },
    { song: '普通朋友', artist: '陶喆' }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试: ${testCase.song} - ${testCase.artist}`);
    console.log('='.repeat(60));

    const song = await ncm.findSong(testCase.song, testCase.artist);

    if (song) {
      console.log(`\n✅ 最终选择: ${song.name} - ${song.artist}`);
      console.log(`   VIP: ${song.vip ? '是' : '否'}`);
      console.log(`   播放链接: ${song.url ? '有' : '无'}`);
    } else {
      console.log(`\n❌ 未找到可播放的歌曲`);
    }

    // 等待一下避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   测试完成                             ║');
  console.log('╚════════════════════════════════════════╝');
}

testSearch().catch(console.error);
