// 完整测试Cookie加载和VIP播放
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

console.log('🔍 完整Cookie和VIP播放测试\n');

// 方法1: 从dotenv加载
const cookieFromEnv = process.env.NCM_COOKIE;
console.log('━'.repeat(60));
console.log('方法1: dotenv加载');
console.log('━'.repeat(60));
console.log('Cookie长度:', cookieFromEnv ? cookieFromEnv.length : 0);
console.log('包含MUSIC_U:', cookieFromEnv ? cookieFromEnv.includes('MUSIC_U') : false);
console.log('字段数量:', cookieFromEnv ? cookieFromEnv.split(';').length : 0);

// 方法2: 直接从文件读取
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/NCM_COOKIE=(.+)/);
const cookieFromFile = match ? match[1].trim() : '';

console.log('\n');
console.log('━'.repeat(60));
console.log('方法2: 直接文件读取');
console.log('━'.repeat(60));
console.log('Cookie长度:', cookieFromFile.length);
console.log('包含MUSIC_U:', cookieFromFile.includes('MUSIC_U'));
console.log('字段数量:', cookieFromFile.split(';').length);

// 比较两种方法
console.log('\n');
console.log('━'.repeat(60));
console.log('对比结果');
console.log('━'.repeat(60));
console.log('长度差异:', cookieFromFile.length - (cookieFromEnv ? cookieFromEnv.length : 0));
console.log('是否相同:', cookieFromFile === cookieFromEnv);

// 测试VIP播放
async function testVIPPlayback() {
  const songId = 347230; // VIP歌曲

  console.log('\n');
  console.log('━'.repeat(60));
  console.log('测试VIP歌曲播放 (ID: 347230)');
  console.log('━'.repeat(60));

  // 使用文件读取的完整Cookie
  const url = `http://localhost:3000/song/url/v1?id=${songId}&level=standard&cookie=${encodeURIComponent(cookieFromFile)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.data && data.data[0]) {
      const song = data.data[0];
      console.log('✅ API响应成功');
      console.log('   歌曲ID:', song.id);
      console.log('   URL:', song.url ? '✅ 有' : '❌ 无');
      console.log('   Fee:', song.fee, song.fee === 1 ? '(VIP歌曲)' : '');
      console.log('   Payed:', song.payed, song.payed === 1 ? '(已付费)' : '(未付费)');
      console.log('   试听信息:', song.freeTrialInfo ? `⚠️ 试听 ${song.freeTrialInfo.end/1000}秒` : '✅ 完整版');
      console.log('   码率:', song.br);
      console.log('   大小:', (song.size / 1024 / 1024).toFixed(2), 'MB');

      if (song.freeTrialInfo) {
        console.log('\n❌ 问题: 仍然是试听版本！');
        console.log('   可能原因:');
        console.log('   1. Cookie已过期');
        console.log('   2. 不是VIP账号');
        console.log('   3. VIP已到期');
      } else {
        console.log('\n✅ 成功: 获取到完整版本！');
      }
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }

  // 验证登录状态
  console.log('\n');
  console.log('━'.repeat(60));
  console.log('验证登录状态');
  console.log('━'.repeat(60));

  try {
    const loginUrl = `http://localhost:3000/login/status?cookie=${encodeURIComponent(cookieFromFile)}`;
    const res = await fetch(loginUrl);
    const data = await res.json();

    console.log('API响应:', JSON.stringify(data, null, 2).substring(0, 500));

    if (data.data && data.data.account) {
      console.log('\n✅ 登录状态有效');
      console.log('   用户ID:', data.data.account.id);
      console.log('   用户名:', data.data.profile?.nickname || '未知');
      console.log('   VIP类型:', data.data.account.vipType);
      console.log('   VIP状态:', data.data.account.vipType === 11 ? '✅ VIP会员' : '❌ 普通用户');
    } else {
      console.log('\n❌ 登录状态无效');
      console.log('   Cookie可能已过期，需要重新获取');
    }
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

testVIPPlayback().catch(console.error);
