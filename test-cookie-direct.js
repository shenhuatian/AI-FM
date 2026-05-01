// 直接测试Cookie传递到网易云API
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const cookie = process.env.NCM_COOKIE;
const songId = 347230; // 测试歌曲ID

console.log('🔍 测试Cookie传递机制\n');
console.log('Cookie长度:', cookie ? cookie.length : 0);
console.log('包含MUSIC_U:', cookie ? cookie.includes('MUSIC_U') : false);
console.log('');

async function testAPI() {
  console.log('━'.repeat(60));
  console.log('测试1: 不带Cookie请求');
  console.log('━'.repeat(60));

  try {
    const url1 = `http://localhost:3000/song/url/v1?id=${songId}&level=standard`;
    const res1 = await fetch(url1);
    const data1 = await res1.json();

    if (data1.data && data1.data[0]) {
      const song = data1.data[0];
      console.log('✅ 获取成功');
      console.log('   URL:', song.url ? '有' : '无');
      console.log('   试听信息:', song.freeTrialInfo ? `${song.freeTrialInfo.end/1000}秒` : '无');
      console.log('   Fee:', song.fee);
      console.log('   Payed:', song.payed);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }

  console.log('\n');
  console.log('━'.repeat(60));
  console.log('测试2: 通过URL参数传递Cookie');
  console.log('━'.repeat(60));

  try {
    const url2 = `http://localhost:3000/song/url/v1?id=${songId}&level=standard&cookie=${encodeURIComponent(cookie)}`;
    const res2 = await fetch(url2);
    const data2 = await res2.json();

    if (data2.data && data2.data[0]) {
      const song = data2.data[0];
      console.log('✅ 获取成功');
      console.log('   URL:', song.url ? '有' : '无');
      console.log('   试听信息:', song.freeTrialInfo ? `${song.freeTrialInfo.end/1000}秒` : '无');
      console.log('   Fee:', song.fee);
      console.log('   Payed:', song.payed);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }

  console.log('\n');
  console.log('━'.repeat(60));
  console.log('测试3: 通过请求头传递Cookie');
  console.log('━'.repeat(60));

  try {
    const url3 = `http://localhost:3000/song/url/v1?id=${songId}&level=standard`;
    const res3 = await fetch(url3, {
      headers: {
        'Cookie': cookie
      }
    });
    const data3 = await res3.json();

    if (data3.data && data3.data[0]) {
      const song = data3.data[0];
      console.log('✅ 获取成功');
      console.log('   URL:', song.url ? '有' : '无');
      console.log('   试听信息:', song.freeTrialInfo ? `${song.freeTrialInfo.end/1000}秒` : '无');
      console.log('   Fee:', song.fee);
      console.log('   Payed:', song.payed);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }

  console.log('\n');
  console.log('━'.repeat(60));
  console.log('测试4: 验证登录状态');
  console.log('━'.repeat(60));

  try {
    const url4 = `http://localhost:3000/login/status?cookie=${encodeURIComponent(cookie)}`;
    const res4 = await fetch(url4);
    const data4 = await res4.json();

    if (data4.data && data4.data.account) {
      console.log('✅ 登录有效');
      console.log('   用户:', data4.data.profile.nickname);
      console.log('   VIP类型:', data4.data.account.vipType);
      console.log('   VIP状态:', data4.data.account.vipType === 11 ? 'VIP会员' : '普通用户');
    } else {
      console.log('❌ 登录无效');
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

testAPI().catch(console.error);
