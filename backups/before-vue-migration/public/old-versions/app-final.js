// ==================== 全局变量 ====================
const audioPlayer = document.getElementById('audioPlayer');
const songName = document.getElementById('songName');
const artistName = document.getElementById('artistName');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const visualizer = document.querySelector('.audio-visualizer');
const timestamp = document.getElementById('timestamp');
const pixelTime = document.getElementById('pixelTime');

let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;

// ==================== 初始化 ====================
window.addEventListener('load', () => {
  console.log('🎵 Claudio FM - Nothing Design Final 已加载');

  // 初始化背景点阵
  initDotMatrix();

  // 更新时间
  updateTime();
  setInterval(updateTime, 1000);

  // 添加欢迎消息
  addDJMessage('嗨！我是Claudio，你的AI音乐DJ。告诉我你想听什么，或者让我根据你的心情推荐歌曲吧 🎵');
});

// ==================== 背景点阵效果 ====================
function initDotMatrix() {
  const canvas = document.getElementById('dotMatrix');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const dotSpacing = 30;
  const dotRadius = 1.5;
  const dotColor = 'rgba(0, 255, 136, 0.3)';

  function drawDots() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += dotSpacing) {
      for (let y = 0; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
    }
  }

  drawDots();

  // 窗口大小改变时重绘
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawDots();
  });
}

// ==================== 更新时间 ====================
function updateTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  if (timestamp) {
    timestamp.textContent = `${hours}:${minutes}`;
  }

  if (pixelTime) {
    pixelTime.textContent = `${hours}:${minutes}`;
  }
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
      addDJMessage(data.say, data.songs, data.reason);
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
    <div class="message-header">
      <div class="message-avatar">👤</div>
      <div class="message-sender">YOU</div>
    </div>
    <div class="message-content">${escapeHtml(text)}</div>
    <div class="message-time">${time}</div>
  `;
  chatMessages.appendChild(messageEl);
  scrollToBottom();
}

// ==================== 添加DJ消息 ====================
function addDJMessage(text, songs = null, reason = null) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  messageEl.dataset.messageId = Date.now();

  let songsHtml = '';
  if (songs && songs.length > 0) {
    songsHtml = '<div class="song-recommendations">';
    songsHtml += '<div class="recommendation-header">推荐歌曲</div>';

    songs.forEach((song, index) => {
      const isFeatured = index === 0;
      songsHtml += `
        <div class="song-card ${isFeatured ? 'featured' : ''}" onclick="playSongByIndex(${index})">
          <div class="song-card-play">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <div class="song-card-info">
            <div class="song-card-title">${escapeHtml(song.name)}</div>
            <div class="song-card-artist">${escapeHtml(song.artist)}</div>
          </div>
        </div>
      `;
    });

    // 添加推荐理由
    if (reason && songs.length > 0) {
      songsHtml += `<div class="song-reason">💡 最推荐 "${escapeHtml(songs[0].name)}"：${escapeHtml(reason)}</div>`;
    }

    songsHtml += '</div>';
  }

  messageEl.innerHTML = `
    <div class="message-header">
      <div class="message-avatar">🎵</div>
      <div class="message-sender">CLAUDIO</div>
    </div>
    <div class="message-content">
      ${text}
      ${songsHtml}
    </div>
    <div class="message-time">${time}</div>
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

  audioPlayer.src = song.url;
  audioPlayer.play().then(() => {
    isPlaying = true;
    updatePlayButton();
    visualizer.classList.add('playing');
    visualizer.classList.remove('paused');
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

// ==================== 更新播放按钮 ====================
function updatePlayButton() {
  if (isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
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
    isPlaying = false;
    visualizer.classList.remove('playing');
    visualizer.classList.add('paused');
  } else {
    audioPlayer.play();
    isPlaying = true;
    visualizer.classList.add('playing');
    visualizer.classList.remove('paused');
  }
  updatePlayButton();
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

// ==================== 停止播放 ====================
function stopPlayback() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    isPlaying = false;
    updatePlayButton();
    visualizer.classList.remove('playing');
    visualizer.classList.add('paused');
  }
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
  const chatSection = document.querySelector('.chat-section');
  if (chatSection) {
    chatSection.scrollTop = chatSection.scrollHeight;
  }
}

// ==================== HTML转义 ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 播放TTS语音 ====================
function playTTS(audioUrl) {
  const ttsAudio = new Audio(audioUrl);
  ttsAudio.volume = 0.8;
  ttsAudio.play().catch(error => {
    console.error('❌ TTS播放失败:', error);
  });
}

// ==================== 音量控制 ====================
function changeVolume(value) {
  if (audioPlayer) {
    audioPlayer.volume = value / 100;
  }
}

// ==================== 喜欢按钮 ====================
let likedSongs = new Set();

function toggleLike() {
  const likeBtn = document.getElementById('likeBtn');
  if (!currentPlaylist[currentIndex]) return;

  const songId = currentPlaylist[currentIndex].id;

  if (likedSongs.has(songId)) {
    likedSongs.delete(songId);
    likeBtn.classList.remove('liked');
  } else {
    likedSongs.add(songId);
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

// ==================== 播放列表弹窗 ====================
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
        item.style.borderColor = 'var(--accent-green)';
        item.style.background = 'var(--accent-green-dim)';
      }

      item.innerHTML = `
        <img src="${song.albumPic || '/default-album.png'}" class="playlist-item-cover" alt="Album" onerror="this.style.display='none'">
        <div class="playlist-item-info">
          <div class="playlist-item-title">${escapeHtml(song.name)}</div>
          <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
        </div>
        <div style="color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);">${formatTime(song.duration / 1000)}</div>
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

// ==================== 收藏夹 ====================
function showFavorites() {
  addDJMessage('收藏夹功能开发中... 🎵');
}

// ==================== 麦克风 ====================
function toggleMic() {
  addDJMessage('语音输入功能开发中... 🎤');
}

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
  // 空格键：播放/暂停
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    togglePlay();
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

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
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

  // 自动聚焦输入框
  chatInput.focus();
});

// ==================== 页面可见性变化 ====================
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    chatInput.focus();
  }
});

// ==================== 调试信息 ====================
console.log(`
╔════════════════════════════════════════╗
║   🎵 Claudio FM - Nothing Design      ║
║        Final Version                   ║
╚════════════════════════════════════════╝

功能:
  ✅ 像素时间显示
  ✅ 背景点阵效果
  ✅ 音频可视化
  ✅ 推荐音乐卡片
  ✅ AI对话区域
  ✅ 播放控制
  ✅ 键盘快捷键

快捷键:
  空格    - 播放/暂停
  N      - 下一首
  P      - 上一首
`);
