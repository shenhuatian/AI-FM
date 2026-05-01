// ==================== 全局变量 ====================
const audioPlayer = document.getElementById('audioPlayer');
const songName = document.getElementById('songName');
const artistName = document.getElementById('artistName');
const albumArt = document.getElementById('albumArt');
const albumArtContainer = document.getElementById('albumArtContainer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const visualizer = document.getElementById('visualizer');
const footerStatus = document.getElementById('footerStatus');

let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;
let audioContext = null;
let analyser = null;
let dataArray = null;

// ==================== 初始化 ====================
window.addEventListener('load', () => {
  console.log('🎵 Claudio FM 已加载');
  addDJMessage('嗨！我是Claudio，你的AI音乐DJ。告诉我你想听什么，或者让我根据你的心情推荐歌曲吧 🎵');

  // 初始化音频上下文（用户交互后）
  document.addEventListener('click', initAudioContext, { once: true });
});

// ==================== 音频上下文初始化 ====================
function initAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;

      const source = audioContext.createMediaElementSource(audioPlayer);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      dataArray = new Uint8Array(analyser.frequencyBinCount);
      console.log('✅ 音频上下文已初始化');
    } catch (error) {
      console.error('❌ 音频上下文初始化失败:', error);
    }
  }
}

// ==================== 音频可视化 ====================
function updateVisualizer() {
  if (!analyser || !isPlaying) return;

  analyser.getByteFrequencyData(dataArray);

  const bars = visualizer.querySelectorAll('.visualizer-bar');
  const step = Math.floor(dataArray.length / bars.length);

  bars.forEach((bar, i) => {
    const value = dataArray[i * step];
    const height = Math.max(20, (value / 255) * 50);
    bar.style.height = height + 'px';
  });

  requestAnimationFrame(updateVisualizer);
}

// ==================== 发送消息 ====================
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  addUserMessage(message);
  chatInput.value = '';
  sendBtn.disabled = true;

  // 显示加载动画
  const loadingId = addDJMessage('正在思考<span class="loading-dots"><span></span><span></span><span></span></span>');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    // 移除加载消息
    removeMessage(loadingId);

    if (data.say) {
      addDJMessage(data.say, data.songs);
    }

    if (data.songs && data.songs.length > 0) {
      currentPlaylist = data.songs;
      currentIndex = 0;
      playSong(data.songs[0]);
    }

    // 播放语音（如果有）
    if (data.audioUrl) {
      playTTS(data.audioUrl);
    }
  } catch (error) {
    console.error('❌ 发送消息失败:', error);
    removeMessage(loadingId);
    addDJMessage('抱歉，出了点问题... 请稍后再试 😅');
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ==================== 添加用户消息 ====================
function addUserMessage(text) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const messageEl = document.createElement('div');
  messageEl.className = 'message user';
  messageEl.innerHTML = `
    <div class="message-avatar">👤</div>
    <div>
      <div class="message-content">${escapeHtml(text)}</div>
      <div class="message-time">${time}</div>
    </div>
  `;
  chatMessages.appendChild(messageEl);
  scrollToBottom();
}

// ==================== 添加DJ消息 ====================
function addDJMessage(text, songs = null) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  messageEl.dataset.messageId = Date.now();

  let songsHtml = '';
  if (songs && songs.length > 0) {
    songsHtml = '<div class="recommended-songs">';
    songs.forEach((song, index) => {
      const vipBadge = song.vip ? '<span class="song-card-badge">VIP</span>' : '';
      songsHtml += `
        <div class="song-card" onclick="playSongByIndex(${index})">
          <div class="song-card-play">▶</div>
          <div class="song-card-info">
            <div class="song-card-title">${escapeHtml(song.name)}</div>
            <div class="song-card-artist">${escapeHtml(song.artist)}</div>
          </div>
          ${vipBadge}
        </div>
      `;
    });
    songsHtml += '</div>';
  }

  messageEl.innerHTML = `
    <div class="message-avatar">🎵</div>
    <div>
      <div class="message-content">
        ${text}
        ${songsHtml}
      </div>
      <div class="message-time">${time}</div>
    </div>
  `;
  chatMessages.appendChild(messageEl);
  scrollToBottom();

  return messageEl.dataset.messageId;
}

// ==================== 移除消息 ====================
function removeMessage(messageId) {
  const message = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
  if (message) {
    message.remove();
  }
}

// ==================== 播放歌曲 ====================
function playSong(song) {
  if (!song || !song.url) {
    addDJMessage('抱歉，无法播放这首歌... 😔');
    return;
  }

  console.log('🎵 播放:', song.name, '-', song.artist);

  songName.textContent = song.name;
  artistName.textContent = song.artist;

  // 显示专辑封面
  if (song.albumPic) {
    albumArt.src = song.albumPic;
    albumArtContainer.style.display = 'flex';
  } else {
    albumArtContainer.style.display = 'none';
  }

  audioPlayer.src = song.url;
  audioPlayer.play().then(() => {
    isPlaying = true;
    playBtn.textContent = '⏸';
    visualizer.classList.add('playing');
    visualizer.classList.remove('paused');
    updateVisualizer();
    updateFooterStatus(`正在播放: ${song.name}`);
  }).catch(error => {
    console.error('❌ 播放失败:', error);
    addDJMessage('播放出错了，让我试试下一首... 🔄');
    skipNext();
  });
}

// ==================== 根据索引播放 ====================
function playSongByIndex(index) {
  if (currentPlaylist[index]) {
    currentIndex = index;
    playSong(currentPlaylist[index]);
  }
}

// ==================== 播放/暂停 ====================
function togglePlay() {
  if (!audioPlayer.src) {
    addDJMessage('还没有歌曲哦，告诉我你想听什么吧 😊');
    return;
  }

  if (isPlaying) {
    audioPlayer.pause();
    playBtn.textContent = '▶';
    isPlaying = false;
    visualizer.classList.remove('playing');
    visualizer.classList.add('paused');
    updateFooterStatus('已暂停');
  } else {
    audioPlayer.play();
    playBtn.textContent = '⏸';
    isPlaying = true;
    visualizer.classList.add('playing');
    visualizer.classList.remove('paused');
    updateVisualizer();
    updateFooterStatus(`正在播放: ${songName.textContent}`);
  }
}

// ==================== 下一首 ====================
function skipNext() {
  if (currentPlaylist.length === 0) {
    addDJMessage('播放列表是空的，让我给你推荐一些歌吧 🎵');
    return;
  }

  currentIndex = (currentIndex + 1) % currentPlaylist.length;
  playSong(currentPlaylist[currentIndex]);
}

// ==================== 上一首 ====================
function skipPrevious() {
  if (currentPlaylist.length === 0) {
    addDJMessage('播放列表是空的，让我给你推荐一些歌吧 🎵');
    return;
  }

  currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
  playSong(currentPlaylist[currentIndex]);
}

// ==================== 快进 ====================
function skipForward() {
  if (!audioPlayer.src) return;
  audioPlayer.currentTime = Math.min(audioPlayer.currentTime + 10, audioPlayer.duration);
}

// ==================== 快退 ====================
function skipBackward() {
  if (!audioPlayer.src) return;
  audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 10, 0);
}

// ==================== 更新进度条 ====================
audioPlayer.addEventListener('timeupdate', () => {
  if (audioPlayer.duration) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = progress + '%';
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    totalTimeEl.textContent = formatTime(audioPlayer.duration);
  }
});

// ==================== 点击进度条跳转 ====================
progressBar.addEventListener('click', (e) => {
  if (!audioPlayer.duration) return;

  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audioPlayer.currentTime = percent * audioPlayer.duration;
});

// ==================== 歌曲结束自动下一首 ====================
audioPlayer.addEventListener('ended', () => {
  console.log('🎵 歌曲播放完毕，自动下一首');
  skipNext();
});

// ==================== 播放错误处理 ====================
audioPlayer.addEventListener('error', (e) => {
  console.error('❌ 音频播放错误:', e);
  addDJMessage('这首歌播放出错了，让我换一首... 🔄');
  skipNext();
});

// ==================== 格式化时间 ====================
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== 处理回车键 ====================
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// ==================== 滚动到底部 ====================
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== HTML转义 ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 更新底部状态 ====================
function updateFooterStatus(text) {
  footerStatus.textContent = text;
}

// ==================== 播放TTS语音 ====================
function playTTS(audioUrl) {
  const ttsAudio = new Audio(audioUrl);
  ttsAudio.volume = 0.8;
  ttsAudio.play().catch(error => {
    console.error('❌ TTS播放失败:', error);
  });
}

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
  // 空格键：播放/暂停
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    togglePlay();
  }

  // 左箭头：后退10秒
  if (e.code === 'ArrowLeft' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    skipBackward();
  }

  // 右箭头：前进10秒
  if (e.code === 'ArrowRight' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    skipForward();
  }

  // N键：下一首
  if (e.code === 'KeyN' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    skipNext();
  }

  // P键：上一首
  if (e.code === 'KeyP' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    skipPrevious();
  }
});

// ==================== 自动聚焦输入框 ====================
chatInput.focus();

// ==================== 页面可见性变化 ====================
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('📱 页面隐藏');
  } else {
    console.log('📱 页面显示');
    chatInput.focus();
  }
});

// ==================== 调试信息 ====================
console.log(`
╔════════════════════════════════════════╗
║      🎵 Claudio FM 前端已加载         ║
╚════════════════════════════════════════╝

快捷键:
  空格    - 播放/暂停
  ←/→    - 后退/前进10秒
  N      - 下一首
  P      - 上一首

功能:
  ✅ 音频可视化
  ✅ 实时对话
  ✅ 歌曲推荐
  ✅ 播放控制
  ✅ 键盘快捷键
`);
// ==================== 新增功能：点阵背景 ====================
function initDotBackground() {
  const canvas = document.getElementById('dotBackground');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const dotSpacing = 30;
  const dotSize = 2;
  const dots = [];

  // 创建点阵
  for (let x = 0; x < canvas.width; x += dotSpacing) {
    for (let y = 0; y < canvas.height; y += dotSpacing) {
      dots.push({
        x: x,
        y: y,
        baseX: x,
        baseY: y,
        opacity: Math.random() * 0.5 + 0.3
      });
    }
  }

  // 动画循环
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const time = Date.now() * 0.001;

    dots.forEach(dot => {
      // 轻微的波动效果
      const offsetX = Math.sin(time + dot.baseY * 0.01) * 2;
      const offsetY = Math.cos(time + dot.baseX * 0.01) * 2;

      ctx.fillStyle = `rgba(0, 255, 136, ${dot.opacity * 0.6})`;
      ctx.beginPath();
      ctx.arc(dot.baseX + offsetX, dot.baseY + offsetY, dotSize, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  animate();

  // 窗口大小改变时重新初始化
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ==================== 新增功能：像素时钟 ====================
function updatePixelClock() {
  const clockEl = document.getElementById('pixelClock');
  const dateEl = document.getElementById('clockDate');
  const fullDateEl = document.getElementById('clockFullDate');

  if (!clockEl) return;

  function update() {
    const now = new Date();

    // 时间 (HH:MM)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}`;

    // 星期
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dateEl.textContent = days[now.getDay()];

    // 完整日期
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = String(now.getDate()).padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    fullDateEl.textContent = `${day} ${month} ${year}`;
  }

  update();
  setInterval(update, 1000);
}

// ==================== 新增功能：音量控制 ====================
function changeVolume(value) {
  if (audioPlayer) {
    audioPlayer.volume = value / 100;
  }
}

// ==================== 新增功能：喜欢按钮 ====================
let likedSongs = new Set();

function toggleLike() {
  const likeBtn = document.getElementById('likeBtn');
  if (!currentPlaylist[currentIndex]) return;

  const songId = currentPlaylist[currentIndex].id;

  if (likedSongs.has(songId)) {
    likedSongs.delete(songId);
    likeBtn.textContent = '♡';
    likeBtn.classList.remove('liked');
  } else {
    likedSongs.add(songId);
    likeBtn.textContent = '♥';
    likeBtn.classList.add('liked');

    // 发送喜欢信息到后端
    fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId: songId,
        songName: currentPlaylist[currentIndex].name,
        artist: currentPlaylist[currentIndex].artist
      })
    }).catch(err => console.error('保存喜欢失败:', err));
  }
}

// ==================== 新增功能：播放列表弹窗 ====================
function showPlaylist() {
  const modal = document.getElementById('playlistModal');
  const itemsContainer = document.getElementById('playlistItems');

  if (!modal || !itemsContainer) return;

  // 清空现有内容
  itemsContainer.innerHTML = '';

  if (currentPlaylist.length === 0) {
    itemsContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">暂无播放列表</div>';
  } else {
    currentPlaylist.forEach((song, index) => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      if (index === currentIndex) {
        item.style.background = 'rgba(0, 255, 136, 0.1)';
      }

      item.innerHTML = `
        <img src="${song.albumPic || '/default-album.png'}" class="playlist-item-cover" alt="Album" onerror="this.style.display='none'">
        <div class="playlist-item-info">
          <div class="playlist-item-title">${escapeHtml(song.name)}</div>
          <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
        </div>
        <div style="color: var(--text-muted); font-size: 12px;">${formatTime(song.duration / 1000)}</div>
      `;

      item.onclick = () => {
        currentIndex = index;
        playSong(currentPlaylist[currentIndex]);
        closePlaylist();
      };

      itemsContainer.appendChild(item);
    });
  }

  modal.classList.add('active');
}

function closePlaylist() {
  const modal = document.getElementById('playlistModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ==================== 新增功能：收藏夹 ====================
function showFavorites() {
  alert('收藏夹功能开发中...');
}

// ==================== 新增功能：停止播放 ====================
function stopPlayback() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    isPlaying = false;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '▶';
    visualizer.classList.remove('playing');
    visualizer.classList.add('paused');
  }
}

// ==================== 初始化新功能 ====================
document.addEventListener('DOMContentLoaded', () => {
  initDotBackground();
  updatePixelClock();

  // 设置初始音量
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider && audioPlayer) {
    audioPlayer.volume = volumeSlider.value / 100;
  }

  // 点击模态框外部关闭
  const modal = document.getElementById('playlistModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePlaylist();
      }
    });
  }
});
