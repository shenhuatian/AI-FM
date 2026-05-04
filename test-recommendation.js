// 测试推荐策略
import dotenv from 'dotenv';
import { NeteaseCloudMusic } from './src/music/ncm.js';
import { StateManager } from './src/brain/state.js';
import { RecommendationStrategy } from './src/brain/recommendation-strategy.js';

dotenv.config();

async function testRecommendation() {
  console.log('🧪 测试推荐策略\n');

  // 初始化服务
  const ncm = new NeteaseCloudMusic(process.env.NCM_COOKIE);
  const state = new StateManager();
  await state.init();

  const strategy = new RecommendationStrategy(ncm, state);

  // 测试1: 相似歌曲推荐
  console.log('='.repeat(60));
  console.log('测试 1: 相似歌曲推荐');
  console.log('='.repeat(60));

  try {
    // 先搜索一首歌获取 ID
    const searchResults = await ncm.search('告白气球', 1);
    if (searchResults.length > 0) {
      const songId = searchResults[0].id;
      console.log(`\n种子歌曲: ${searchResults[0].name} - ${searchResults[0].artist} (ID: ${songId})`);

      const similarSongs = await ncm.getSimilarSongs(songId, 5);
      console.log(`\n找到 ${similarSongs.length} 首相似歌曲:`);
      similarSongs.forEach((song, i) => {
        console.log(`  ${i + 1}. ${song.name} - ${song.artist}`);
      });
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  // 测试2: 艺术家搜索和热门歌曲
  console.log('\n' + '='.repeat(60));
  console.log('测试 2: 艺术家搜索和热门歌曲');
  console.log('='.repeat(60));

  try {
    const artists = await ncm.searchArtist('周杰伦', 1);
    if (artists.length > 0) {
      const artist = artists[0];
      console.log(`\n找到艺术家: ${artist.name} (ID: ${artist.id})`);

      const topSongs = await ncm.getArtistTopSongs(artist.id, 10);
      console.log(`\n热门歌曲 (前10首):`);
      topSongs.forEach((song, i) => {
        const popTag = song.popularity ? ` [热度: ${song.popularity}]` : '';
        console.log(`  ${i + 1}. ${song.name}${popTag}`);
      });
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  // 测试3: 混合推荐策略
  console.log('\n' + '='.repeat(60));
  console.log('测试 3: 混合推荐策略（70% 探索 + 30% 舒适区）');
  console.log('='.repeat(60));

  try {
    const recommendations = await strategy.hybridRecommend(
      '推荐一些说唱歌曲',
      5,
      {
        mood: '激动',
        preferFresh: true,
        excludeRecent: true
      }
    );

    console.log(`\n混合推荐结果 (${recommendations.length} 首):`);
    recommendations.forEach((song, i) => {
      console.log(`  ${i + 1}. ${song.name} - ${song.artist}`);
    });
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  // 测试4: 智能推荐（意图分析）
  console.log('\n' + '='.repeat(60));
  console.log('测试 4: 智能推荐（自动意图分析）');
  console.log('='.repeat(60));

  const testMessages = [
    '推荐一些陶喆的歌，我想要听一些我没怎么听过的',
    '来点开心的歌',
    '推荐一些说唱歌曲'
  ];

  for (const message of testMessages) {
    console.log(`\n用户消息: "${message}"`);

    try {
      const recommendations = await strategy.smartRecommend(message, 3);
      console.log(`推荐结果 (${recommendations.length} 首):`);
      recommendations.forEach((song, i) => {
        console.log(`  ${i + 1}. ${song.name} - ${song.artist}`);
      });
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    }
  }

  // 测试5: 热度筛选
  console.log('\n' + '='.repeat(60));
  console.log('测试 5: 热度筛选（冷门歌曲）');
  console.log('='.repeat(60));

  try {
    const artists = await ncm.searchArtist('周杰伦', 1);
    if (artists.length > 0) {
      const topSongs = await ncm.getArtistTopSongs(artists[0].id, 20);

      console.log(`\n原始歌曲数: ${topSongs.length}`);

      const lowPopSongs = strategy.filterByPopularity(topSongs, 'low');
      console.log(`\n冷门歌曲 (${lowPopSongs.length} 首):`);
      lowPopSongs.slice(0, 5).forEach((song, i) => {
        const popTag = song.popularity ? ` [热度: ${song.popularity}]` : '';
        console.log(`  ${i + 1}. ${song.name}${popTag}`);
      });

      const highPopSongs = strategy.filterByPopularity(topSongs, 'high');
      console.log(`\n热门歌曲 (${highPopSongs.length} 首):`);
      highPopSongs.slice(0, 5).forEach((song, i) => {
        const popTag = song.popularity ? ` [热度: ${song.popularity}]` : '';
        console.log(`  ${i + 1}. ${song.name}${popTag}`);
      });
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成');
  console.log('='.repeat(60));
}

testRecommendation().catch(console.error);
