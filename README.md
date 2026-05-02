# 🎵 Claudio FM - 你的AI音乐DJ

<div align="center">

![Claudio FM](https://img.shields.io/badge/Claudio%20FM-AI%20Music%20DJ-00ff88?style=for-the-badge)
![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?style=for-the-badge&logo=vue.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![DeepSeek](https://img.shields.io/badge/DeepSeek-AI-FF6B6B?style=for-the-badge)

**一个有温度的AI音乐DJ，懂你的心情，陪你听歌**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [配置指南](#-配置指南) • [使用说明](#-使用说明) • [常见问题](#-常见问题)

</div>

---

## 📖 项目简介

Claudio FM 是一个基于 **DeepSeek AI** 的智能音乐DJ系统，它不仅能根据你的心情、时间、天气推荐音乐，还会像朋友一样主动关心你，陪你聊天。

### 为什么选择 Claudio FM？

- 🧠 **真正的AI大脑** - 使用DeepSeek AI，理解你的需求，而不是简单的算法推荐
- 💬 **会聊天的DJ** - 不只是推荐音乐，还能陪你聊天，分享音乐故事
- 🎯 **精准推荐** - 学习你的音乐品味，越用越懂你
- 🌈 **赛博朋克风格** - 炫酷的界面设计，沉浸式体验
- 🔒 **隐私安全** - 所有数据存储在本地，完全掌控

---

## ✨ 功能特性

### 核心功能

- 🎵 **智能音乐推荐** - 基于时间、天气、心情、场景的个性化推荐
- 💬 **自然对话** - 像朋友一样聊天，不会强行推荐音乐
- 🤖 **主动关心** - AI会定时主动询问你的状态（可自定义频率）
- ❤️ **反馈学习** - 喜欢/不喜欢/收藏，AI会记住你的偏好
- 📚 **播放列表** - 智能管理播放队列
- 🎤 **语音合成** - DJ的话可以用语音播放（可选）

### 高级功能

- 📊 **音乐库导入** - 导入你的网易云音乐数据，AI更懂你
- ⏰ **定时推荐** - 早晨、工作、晚间自动推荐合适的音乐
- 🌤️ **天气联动** - 根据天气推荐音乐（可选）
- 📅 **日程联动** - 连接飞书日历，根据日程推荐（可选）
- 🎨 **个性化配置** - 自定义音乐品味、作息规则、心情映射

---

## 🚀 快速开始

### 环境要求

- **Node.js** 18+ 
- **npm** 或 **yarn**
- **DeepSeek API Key**（必需）
- **网易云音乐 Cookie**（推荐，用于播放VIP歌曲）

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/claudio-fm.git
cd claudio-fm
```

#### 2. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装网易云API依赖
cd netease-api/api-enhanced-main
npm install
cd ../..

# 安装前端依赖
cd frontend
npm install
cd ..
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
# Windows: notepad .env
# Mac/Linux: nano .env
```

**必需配置：**
```env
DEEPSEEK_API_KEY=你的DeepSeek API Key
```

**推荐配置：**
```env
NCM_COOKIE=你的网易云音乐Cookie
```

**可选配置：**
```env
FISH_API_KEY=你的Fish Audio API Key（语音合成）
OPENWEATHER_API_KEY=你的OpenWeather API Key（天气服务）
FEISHU_APP_ID=你的飞书App ID（日程服务）
FEISHU_APP_SECRET=你的飞书App Secret
```

#### 4. 启动项目

```bash
# 方式一：同时启动前后端（推荐）
npm run dev

# 方式二：分别启动
# 终端1 - 启动网易云API
cd netease-api/api-enhanced-main
node server.js

# 终端2 - 启动后端
npm run start:backend

# 终端3 - 启动前端
npm run start:frontend
```

#### 5. 访问应用

打开浏览器访问：**http://localhost:3030**

---

## 🔑 配置指南

### 获取 DeepSeek API Key（必需）

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 进入 **API Keys** 页面
4. 点击 **创建新的API Key**
5. 复制API Key，填入 `.env` 文件

**费用说明：** DeepSeek API 按使用量计费，新用户有免费额度，日常使用成本很低（约几毛钱/天）

---

### 获取网易云音乐 Cookie（推荐）

**为什么需要Cookie？**
- 播放VIP歌曲
- 获取更高音质
- 导入你的音乐库数据

**获取步骤：**

1. **打开网易云音乐网页版**
   - 访问 https://music.163.com/
   - 登录你的账号

2. **打开浏览器开发者工具**
   - Chrome/Edge: 按 `F12` 或 `Ctrl+Shift+I`
   - Firefox: 按 `F12`
   - Safari: `Command+Option+I`

3. **切换到 Network（网络）标签**
   - 刷新页面（`F5`）
   - 在请求列表中找到任意一个请求
   - 点击该请求

4. **复制 Cookie**
   - 在右侧面板找到 **Request Headers**（请求头）
   - 找到 **Cookie** 字段
   - 复制整个Cookie值（很长的一串文本）

5. **填入配置**
   - 打开 `.env` 文件
   - 找到 `NCM_COOKIE=` 这一行
   - 粘贴Cookie值（用引号包裹）
   ```env
   NCM_COOKIE="你复制的Cookie内容"
   ```

**注意事项：**
- Cookie 包含你的登录信息，请勿分享给他人
- Cookie 可能会过期，如果无法播放VIP歌曲，重新获取即可
- 建议使用VIP账号，体验更好

---

### 其他可选配置

#### Fish Audio API（语音合成）

1. 访问 [Fish Audio](https://fish.audio/)
2. 注册账号并获取API Key
3. 填入 `.env` 文件的 `FISH_API_KEY`

**效果：** DJ的话会用语音播放，更有沉浸感

#### OpenWeather API（天气服务）

1. 访问 [OpenWeather](https://openweathermap.org/api)
2. 注册账号并获取API Key
3. 填入 `.env` 文件的 `OPENWEATHER_API_KEY`

**效果：** AI会根据天气推荐音乐（晴天听欢快的，雨天听安静的）

#### 飞书日历（日程服务）

1. 创建飞书应用
2. 获取 App ID 和 App Secret
3. 填入 `.env` 文件

**效果：** AI会根据你的日程推荐音乐（会议前听专注的，休息时听放松的）

---

## 📚 使用说明

### 基础使用

#### 1. 与DJ对话

在底部输入框输入你的需求：

```
"推荐首歌"
"我想听陶喆的歌"
"来点适合工作的音乐"
"心情不好，听点治愈的"
```

#### 2. 纯聊天模式

如果只想聊天，不想听音乐：

```
"我们聊会天吧"
"今天心情怎么样"
"最近有什么有趣的事吗"
```

AI会识别你的意图，不会强行推荐音乐。

#### 3. 反馈系统

- 👍 **喜欢** - 告诉AI你喜欢这首歌，以后会推荐类似的
- 👎 **不喜欢** - 告诉AI你不喜欢，以后会避免推荐
- ⭐ **收藏** - 收藏喜欢的歌曲，方便以后查找

#### 4. 播放控制

- ▶️ **播放/暂停**
- ⏮️ **上一首**
- ⏭️ **下一首**
- ⏹️ **停止**
- 🔊 **音量调节**
- 📋 **播放列表**
- ⭐ **收藏夹**

---

### 高级使用

#### 导入网易云音乐库

让AI更懂你的音乐品味：

```bash
# 确保已配置 NCM_COOKIE
npm run import:music
```

导入后，AI会参考你的：
- 听歌排行
- 喜欢的音乐
- 自建歌单
- 最近播放

#### 自定义音乐品味

编辑 `user/taste.md` 文件：

```markdown
## 喜欢的音乐类型
- JAZZ
- 90S华语
- 流行

## 喜欢的艺人
- 陶喆
- 王力宏
- 方大同

## 不喜欢的
- 重金属
- 说唱
```

#### 自定义作息规则

编辑 `user/routines.md` 文件：

```markdown
## 工作日
- 07:00 - 08:00: 起床洗漱，需要轻快的音乐
- 09:00 - 12:00: 上午工作，需要专注的轻音乐
- 12:00 - 13:00: 午餐休息，可以听喜欢的歌
```

#### 主动对话设置

AI会定时主动询问你的状态，可以在设置中调整：

- **Quiet（安静）** - 60分钟检查一次
- **Medium（适中）** - 20分钟检查一次
- **Active（活跃）** - 15分钟检查一次

---

## 🎨 界面说明

### 主界面布局

```
┌─────────────────────────────────┐
│  🕐 时钟 + DJ头像                │  ← 点击头像查看DJ信息
├─────────────────────────────────┤
│  🎵 当前歌曲 + 诗歌              │  ← 可折叠
├─────────────────────────────────┤
│  ▶️ 播放控制 + 进度条            │
├─────────────────────────────────┤
│  💬 聊天区域                     │  ← 滚动查看历史
│     - 用户消息                   │
│     - DJ回复                     │
│     - 推荐歌曲卡片               │
│     - 反馈按钮（👍👎⭐）         │
├─────────────────────────────────┤
│  ✍️ 输入框 + 发送按钮            │  ← 固定在底部
└─────────────────────────────────┘
```

### 特色功能

- **赛博朋克风格** - 炫酷的视觉效果
- **星空背景** - 动态星空粒子
- **音乐粒子** - 跟随音乐律动
- **氛围光** - 根据播放状态变化
- **像素时钟** - 复古风格时钟

---

## 🛠️ 开发说明

### 项目结构

```
claudio-fm/
├── src/                          # 后端源码
│   ├── index.js                  # 主服务器入口
│   ├── brain/                    # AI大脑模块
│   │   ├── deepseek.js          # DeepSeek适配器
│   │   ├── state.js             # 状态管理
│   │   ├── router.js            # 路由分流器
│   │   ├── context.js           # 上下文构建器
│   │   ├── scheduler.js         # 定时调度器
│   │   ├── tts.js               # TTS语音合成
│   │   └── proactive.js         # 主动对话系统
│   ├── music/                    # 音乐服务
│   │   └── ncm.js               # 网易云音乐API
│   └── services/                 # 外部服务
│       ├── weather.js           # 天气服务
│       └── feishu.js            # 飞书日历
├── frontend/                     # 前端源码
│   ├── src/
│   │   ├── App.vue              # 主应用
│   │   ├── components/          # Vue组件
│   │   └── utils/               # 工具函数
│   └── package.json
├── netease-api/                  # 网易云API服务
├── prompts/                      # AI提示词
│   └── dj-persona.md            # DJ人设
├── user/                         # 用户配置
│   ├── taste.md                 # 音乐品味
│   ├── routines.md              # 作息规则
│   └── mood-rules.md            # 心情规则
├── data/                         # 数据存储
│   └── state.json               # 状态数据
├── cache/                        # 缓存目录
├── scripts/                      # 工具脚本
│   └── import-music-history.js  # 音乐库导入
├── .env.example                  # 环境变量模板
├── package.json
└── README.md
```

### 技术栈

**后端：**
- Node.js + Express
- DeepSeek API（AI大脑）
- 网易云音乐API
- WebSocket（实时通信）

**前端：**
- Vue 3 + Vite
- 赛博朋克风格CSS
- LocalStorage（数据持久化）

**AI Prompt工程：**
- DJ人设设计
- 意图识别
- 上下文管理
- 反馈学习

---

## ❓ 常见问题

### Q1: 无法播放VIP歌曲？

**A:** 需要配置网易云音乐Cookie，且Cookie对应的账号需要是VIP会员。

### Q2: AI回复很慢？

**A:** DeepSeek API响应时间约1-3秒，这是正常的。如果超过10秒，检查网络连接和API Key是否有效。

### Q3: Cookie过期了怎么办？

**A:** 重新按照教程获取Cookie，更新 `.env` 文件，重启服务即可。

### Q4: 可以不配置Cookie吗？

**A:** 可以，但只能播放免费歌曲，无法播放VIP歌曲和获取高音质。

### Q5: 如何关闭主动对话？

**A:** 在设置中将主动对话级别设为 "Quiet"，或者在代码中关闭该功能。

### Q6: 数据存储在哪里？

**A:** 所有数据存储在本地：
- 后端数据：`data/state.json`
- 前端数据：浏览器 LocalStorage
- 完全隐私，不会上传到任何服务器

### Q7: 支持其他音乐平台吗？

**A:** 目前只支持网易云音乐。如果需要其他平台，可以自行扩展 `src/music/` 目录。

### Q8: 可以部署到服务器吗？

**A:** 可以，但需要注意：
- 配置环境变量
- 使用 PM2 等进程管理工具
- 配置反向代理（Nginx）
- 注意Cookie安全

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 如何贡献

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范

- 代码风格：遵循项目现有风格
- 提交信息：使用清晰的提交信息
- 文档：更新相关文档

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [DeepSeek](https://www.deepseek.com/) - 提供强大的AI能力
- [网易云音乐API](https://github.com/Binaryify/NeteaseCloudMusicApi) - 音乐数据来源
- [Fish Audio](https://fish.audio/) - 语音合成服务
- [Vue.js](https://vuejs.org/) - 前端框架

---

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/你的用户名/claudio-fm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/你的用户名/claudio-fm/discussions)

---

## 🌟 Star History

如果这个项目对你有帮助，请给个 Star ⭐️

---

<div align="center">

**Made with ❤️ by [你的名字]**

**Powered by DeepSeek AI**

</div>
