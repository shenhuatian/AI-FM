// 测试网易云音乐 API
import { NeteaseCloudMusic } from './src/music/ncm.js';
import dotenv from 'dotenv';

dotenv.config();

const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);

async function test() {
  console.log('========================================');
  console.log('  网易云音乐 API 测试');
  console.log('========================================\n');

  console.log('测试 1: 搜索歌曲');
  console.log('-------------------');
  const results = await ncm.search('周杰伦', 3);
  if (results.length > 0) {
    console.log(`✅ 搜索成功，找到 ${results.length} 首歌曲`);
    results.forEach((song, i) => {
      console.log(`  ${i + 1}. ${song.name} - ${song.artist} ${song.vip ? '[VIP]' : ''}`);
    });
  } else {
    console.log('❌ 搜索失败');
    return;
  }

  console.log('\n测试 2: 获取播放链接');
  console.log('-------------------');
  const firstSong = results[0];
  const url = await ncm.getSongUrl(firstSong.id);
  if (url) {
    console.log(`✅ 获取播放链接成功`);
    console.log(`  歌曲: ${firstSong.name}`);
    console.log(`  链接: ${url.substring(0, 50)}...`);
  } else {
    console.log('❌ 获取播放链接失败');
  }

  console.log('\n========================================');
  console.log('  测试完成');
  console.log('========================================');
}

test().catch(console.error);
