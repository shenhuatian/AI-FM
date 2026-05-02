// 网易云音乐历史导入脚本
import fetch from 'node-fetch';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const NCM_COOKIE = process.env.NCM_COOKIE;
const BASE_URL = 'http://localhost:3000';

/**
 * 发起网易云API请求
 */
async function fetchNCM(endpoint) {
  try {
    const cookieParam = NCM_COOKIE ? `?cookie=${encodeURIComponent(NCM_COOKIE)}` : '';
    const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}cookie=${encodeURIComponent(NCM_COOKIE)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ 请求失败 ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo() {
  console.log('📋 获取用户信息...');
  const data = await fetchNCM('/login/status');

  if (data && data.data && data.data.account) {
    const profile = data.data.profile;
    console.log(`✅ 用户: ${profile.nickname} (ID: ${profile.userId})`);
    return {
      userId: profile.userId,
      nickname: profile.nickname
    };
  }

  console.error('❌ 无法获取用户信息，请检查 Cookie 是否有效');
  return null;
}

/**
 * 获取用户喜欢的音乐（红心歌曲）
 */
async function getLikedSongs(userId) {
  console.log('\n❤️ 获取喜欢的音乐...');
  const data = await fetchNCM(`/likelist?uid=${userId}`);

  if (data && data.ids) {
    console.log(`✅ 找到 ${data.ids.length} 首喜欢的歌曲`);
    return data.ids;
  }

  return [];
}

/**
 * 获取歌曲详情
 */
async function getSongDetails(ids) {
  if (ids.length === 0) return [];

  console.log(`📝 获取歌曲详情 (${ids.length} 首)...`);

  // 分批获取，每次最多100首
  const batchSize = 100;
  const songs = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const data = await fetchNCM(`/song/detail?ids=${batch.join(',')}`);

    if (data && data.songs) {
      songs.push(...data.songs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.ar.map(a => a.name).join('/'),
        album: song.al.name,
        albumPic: song.al.picUrl || null
      })));
    }

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`✅ 获取了 ${songs.length} 首歌曲详情`);
  return songs;
}

/**
 * 获取用户歌单
 */
async function getUserPlaylists(userId) {
  console.log('\n📚 获取用户歌单...');
  const data = await fetchNCM(`/user/playlist?uid=${userId}&limit=50`);

  if (data && data.playlist) {
    const myPlaylists = data.playlist.filter(p => p.creator.userId === userId);
    console.log(`✅ 找到 ${myPlaylists.length} 个自建歌单`);

    return myPlaylists.map(p => ({
      id: p.id,
      name: p.name,
      trackCount: p.trackCount,
      playCount: p.playCount
    }));
  }

  return [];
}

/**
 * 获取歌单详情
 */
async function getPlaylistDetail(playlistId) {
  const data = await fetchNCM(`/playlist/detail?id=${playlistId}`);

  if (data && data.playlist && data.playlist.tracks) {
    return data.playlist.tracks.map(song => ({
      id: song.id,
      name: song.name,
      artist: song.ar.map(a => a.name).join('/'),
      album: song.al.name
    }));
  }

  return [];
}

/**
 * 获取听歌排行
 */
async function getPlayRecord(userId) {
  console.log('\n📊 获取听歌排行...');
  const data = await fetchNCM(`/user/record?uid=${userId}&type=1`); // type=1 所有时间

  if (data && data.allData) {
    console.log(`✅ 找到 ${data.allData.length} 首常听歌曲`);

    return data.allData.map(item => ({
      id: item.song.id,
      name: item.song.name,
      artist: item.song.ar.map(a => a.name).join('/'),
      album: item.song.al.name,
      playCount: item.playCount,
      score: item.score
    }));
  }

  return [];
}

/**
 * 获取最近播放
 */
async function getRecentPlayed() {
  console.log('\n🕐 获取最近播放...');
  const data = await fetchNCM('/record/recent/song');

  if (data && data.data && data.data.list) {
    console.log(`✅ 找到 ${data.data.list.length} 首最近播放`);

    return data.data.list.map(item => ({
      id: item.data.id,
      name: item.data.name,
      artist: item.data.ar.map(a => a.name).join('/'),
      album: item.data.al.name,
      playTime: new Date(item.playTime).toISOString()
    }));
  }

  return [];
}

/**
 * 主函数
 */
async function main() {
  console.log('🎵 开始导入网易云音乐数据...\n');

  if (!NCM_COOKIE) {
    console.error('❌ 未找到 NCM_COOKIE，请在 .env 文件中配置');
    process.exit(1);
  }

  // 1. 获取用户信息
  const userInfo = await getUserInfo();
  if (!userInfo) {
    process.exit(1);
  }

  // 2. 获取喜欢的音乐
  const likedIds = await getLikedSongs(userInfo.userId);
  const likedSongs = await getSongDetails(likedIds.slice(0, 200)); // 限制200首，避免太多

  // 3. 获取听歌排行
  const topSongs = await getPlayRecord(userInfo.userId);

  // 4. 获取最近播放
  const recentSongs = await getRecentPlayed();

  // 5. 获取用户歌单
  const playlists = await getUserPlaylists(userInfo.userId);

  // 获取前5个歌单的详情
  console.log('\n📋 获取歌单详情...');
  const playlistDetails = [];
  for (const playlist of playlists.slice(0, 5)) {
    console.log(`  - ${playlist.name}`);
    const songs = await getPlaylistDetail(playlist.id);
    playlistDetails.push({
      ...playlist,
      songs: songs.slice(0, 50) // 每个歌单最多50首
    });
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // 6. 组装数据
  const musicLibrary = {
    user: {
      id: userInfo.userId,
      nickname: userInfo.nickname,
      importedAt: new Date().toISOString()
    },
    likedSongs: likedSongs,
    topSongs: topSongs.slice(0, 100), // 前100首
    recentSongs: recentSongs.slice(0, 50), // 最近50首
    playlists: playlistDetails,
    statistics: {
      totalLiked: likedSongs.length,
      totalTop: topSongs.length,
      totalRecent: recentSongs.length,
      totalPlaylists: playlists.length
    }
  };

  // 7. 保存到文件
  const outputPath = 'user/my-music-library.json';
  await fs.writeFile(outputPath, JSON.stringify(musicLibrary, null, 2), 'utf-8');

  console.log('\n✅ 导入完成！');
  console.log(`📁 数据已保存到: ${outputPath}`);
  console.log('\n📊 统计信息:');
  console.log(`  - 喜欢的歌曲: ${musicLibrary.statistics.totalLiked} 首`);
  console.log(`  - 常听歌曲: ${musicLibrary.statistics.totalTop} 首`);
  console.log(`  - 最近播放: ${musicLibrary.statistics.totalRecent} 首`);
  console.log(`  - 歌单数量: ${musicLibrary.statistics.totalPlaylists} 个`);

  console.log('\n💡 提示: AI DJ 现在会参考这些数据来推荐音乐！');
}

// 运行
main().catch(error => {
  console.error('❌ 导入失败:', error);
  process.exit(1);
});
