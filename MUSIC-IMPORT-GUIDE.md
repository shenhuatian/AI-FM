# 音乐库导入功能实现指南

## 📋 实现概述

在配置中心添加"导入音乐库"功能，让用户可以一键导入网易云音乐库。

---

## 🎯 需要添加的后端 API

在 `src/index.js` 中添加以下两个接口：

### 1. 导入音乐库接口

```javascript
/**
 * POST /api/import-music - 导入音乐库
 */
app.post('/api/import-music', async (req, res) => {
  try {
    const { cookie } = req.body;
    
    if (!cookie) {
      return res.status(400).json({ error: '缺少 Cookie' });
    }

    // 使用 child_process 调用导入脚本
    const { spawn } = await import('child_process');
    const importProcess = spawn('node', ['scripts/import-music-history.js'], {
      env: { ...process.env, NCM_COOKIE: cookie }
    });

    let songCount = 0;

    importProcess.stdout.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/(\d+)\s*首/);
      if (match) {
        songCount = parseInt(match[1]);
      }
    });

    importProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, songCount });
      } else {
        res.status(500).json({ success: false, error: '导入失败' });
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. 获取音乐库状态接口

```javascript
/**
 * GET /api/music-library-status - 获取音乐库状态
 */
app.get('/api/music-library-status', async (req, res) => {
  try {
    const musicLibraryPath = 'user/my-music-library.json';
    
    try {
      const stats = await fs.stat(musicLibraryPath);
      const data = JSON.parse(await fs.readFile(musicLibraryPath, 'utf-8'));
      
      res.json({
        imported: true,
        songCount: data.length || 0,
        lastUpdate: stats.mtime
      });
    } catch (error) {
      res.json({
        imported: false,
        songCount: 0,
        lastUpdate: null
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📝 完整的 ConfigModal.vue 代码

请参考此文档手动实现前端界面。

---

**实现完成后，用户就可以在配置中心一键导入音乐库了！** 🎵
