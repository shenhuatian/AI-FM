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
