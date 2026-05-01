// 测试网易云音乐API
import { NeteaseCloudMusic } from './src/music/ncm.js';
import dotenv from 'dotenv';

dotenv.config();

const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);

async function test() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   网易云音乐API测试                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 测试1: 搜索歌曲
  console.log('【测试1】搜索歌曲: 周杰伦 晴天');
  console.log('─'.repeat(50));
  const searchResults = await ncm.search('周杰伦 晴天', 5);
  if (searchResults.length > 0) {
    searchResults.forEach((song, index) => {
      console.log(`${index + 1}. ${song.name} - ${song.artist} ${song.vip ? '[VIP]' : ''}`);
    });
  } else {
    console.log('❌ 搜索失败或无结果');
  }

  console.log('\n');

  // 测试2: 查找并获取播放链接
  console.log('【测试2】查找歌曲并获取播放链接');
  console.log('─'.repeat(50));
  const song = await ncm.findSong('晴天', '周杰伦');
  if (song) {
    console.log(`✅ 找到歌曲: ${song.name} - ${song.artist}`);
    console.log(`   专辑: ${song.album}`);
    console.log(`   VIP: ${song.vip ? '是' : '否'}`);
    console.log(`   播放链接: ${song.url ? song.url.substring(0, 80) + '...' : '无'}`);
    console.log(`   封面: ${song.albumPic ? song.albumPic.substring(0, 80) + '...' : '无'}`);
  } else {
    console.log('❌ 查找失败');
  }

  console.log('\n');

  // 测试3: 测试VIP歌曲处理
  console.log('【测试3】测试VIP歌曲处理');
  console.log('─'.repeat(50));
  const vipSong = await ncm.findSong('稻香', '周杰伦');
  if (vipSong) {
    console.log(`✅ 找到歌曲: ${vipSong.name} - ${vipSong.artist}`);
    console.log(`   VIP: ${vipSong.vip ? '是' : '否'}`);
    console.log(`   播放链接: ${vipSong.url ? '有' : '无（可能需要VIP）'}`);
  } else {
    console.log('❌ 查找失败');
  }

  console.log('\n');

  // 测试4: 测试不同艺术家
  console.log('【测试4】测试其他艺术家');
  console.log('─'.repeat(50));
  const song2 = await ncm.findSong('爱情转移', '陶喆');
  if (song2) {
    console.log(`✅ 找到歌曲: ${song2.name} - ${song2.artist}`);
    console.log(`   播放链接: ${song2.url ? '有' : '无'}`);
  } else {
    console.log('❌ 查找失败');
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   测试完成                             ║');
  console.log('╚════════════════════════════════════════╝');
}

test().catch(console.error);
