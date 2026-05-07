# 🎵 Phoenix FM - 你的AI音乐DJ

<div align="center">

![Phoenix FM](https://img.shields.io/badge/Phoenix%20FM-AI%20Music%20DJ-00ff88?style=for-the-badge)
![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?style=for-the-badge&logo=vue.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![DeepSeek](https://img.shields.io/badge/DeepSeek-AI-FF6B6B?style=for-the-badge)

**一个有温度的AI音乐DJ，懂你的心情，陪你听歌**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [配置指南](#-配置指南) • [使用说明](#-使用说明) • [常见问题](#-常见问题)

</div>

---

## 📖 项目简介

Phoenix FM 是一个基于 **DeepSeek AI** 的智能音乐DJ系统，它不仅能根据你的心情、时间、天气推荐音乐，还会像朋友一样主动关心你，陪你聊天。

### 为什么选择 Phoenix FM？

- 🧠 **真正的AI大脑** - 使用DeepSeek AI，理解你的需求，而不是简单的算法推荐
- 💬 **会聊天的DJ** - 不只是推荐音乐，还能陪你聊天，分享音乐故事
- 🎯 **精准推荐** - 学习你的音乐品味，越用越懂你
- 🌈 **赛博朋克风格** - 炫酷的界面设计，沉浸式体验
- 🔒 **隐私安全** - 所有数据存储在本地，完全掌控
- 🎵 **海量曲库** - 接入网易云音乐数百万首歌曲
- 💾 **数据持久化** - 配置和收藏永久保存，重启不丢失

---

## ✨ 功能特性

### 核心功能

- 🎵 **智能音乐推荐** - 基于时间、天气、心情、场景的个性化推荐
- 🌐 **混合推荐策略** - 70% 探索新歌 + 30% 舒适区，推荐更多样化
- 🔍 **相似推荐** - 自动补充相似歌曲，保证推荐数量
- 🎯 **热度筛选** - 支持冷门/热门歌曲筛选，发现宝藏音乐
- 💬 **自然对话** - 像朋友一样聊天，不会强行推荐音乐
- 🤖 **主动关心** - AI会定时主动询问你的状态（可自定义频率）
- ❤️ **反馈学习** - 喜欢/不喜欢/收藏，AI会记住你的偏好
- 📚 **播放列表** - 智能管理播放队列
- 🎤 **语音合成** - DJ的话可以用语音播放（可选）
- 💾 **数据持久化** - 配置和收藏数据永久保存

### 高级功能

- 📊 **音乐库导入** - 导入你的网易云音乐数据，AI更懂你
- 🔄 **RAG向量搜索** - 基于TF-IDF的本地语义搜索，快速找到想听的歌
- ⏰ **定时推荐** - 早晨、工作、晚间自动推荐合适的音乐
- 🌤️ **天气联动** - 根据天气推荐音乐（可选）
- 📅 **日程联动** - 连接飞书日历，根据日程推荐（可选）
- 🎨 **个性化配置** - 自定义音乐品味、作息规则、心情映射
- ⚙️ **配置向导** - 首次使用引导配置，简单易用

### 🆕 最新更新（2026-05-07）

- ✅ **配置持久化** - 配置保存到.env文件，重启不丢失
- ✅ **收藏夹持久化** - 收藏数据永久保存，清除缓存也能恢复
- ✅ **配置向导优化** - 首次使用更友好的引导流程
- ✅ **数据双重存储** - 前端缓存 + 后端持久化，数据更安全
- ✅ **AI名字定制** - 支持自定义AI DJ名字
- ✅ **代码优化** - 统一配置管理，减少重复代码

### 历史更新（2026-05-04）

- ✅ **混合推荐系统** - 70% 探索新歌 + 30% 舒适区，推荐更多样化
- ✅ **相似歌曲推荐** - 自动补充相似歌曲，找不到歌曲时不再返回空列表
- ✅ **艺术家推荐** - 支持相似艺术家推荐，发现新的音乐人
- ✅ **热度筛选** - 支持冷门/热门歌曲筛选，满足不同需求
- ✅ **智能意图识别** - 自动识别艺术家、心情、冷门偏好
- ✅ **去重优化** - 按歌曲名称去重，避免重复推荐

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
git clone https://github.com/shenhuatian/AI-FM.git
cd AI-FM
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

**方式一：使用配置向导（推荐）**

首次启动时会自动显示配置向导，按照提示填写即可。

**方式二：手动配置**

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# DeepSeek API Key（必需）
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 网易云音乐 Cookie（推荐）
NCM_COOKIE="your_netease_cookie_here"

# 小米 MiMo TTS API Key（可选，用于语音合成）
XIAOMI_API_KEY=your_xiaomi_api_key_here

# OpenWeather API Key（可选，用于天气服务）
OPENWEATHER_API_KEY=your_openweather_api_key_here

# 飞书日历（可选）
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
```

#### 4. 启动服务

```bash
npm run dev
```

服务启动后，访问：**http://localhost:8080**

---

## 📝 配置指南

### 获取 DeepSeek API Key（必需）

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册并登录账号
3. 进入"API Keys"页面
4. 点击"创建新的 API Key"
5. 复制生成的 Key（以 `sk-` 开头）

💡 新用户通常有免费额度可以使用

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

#### 小米 MiMo TTS API（语音合成）

1. 访问 [小米 MiMo 平台](https://platform.xiaomimimo.com/)
2. 注册账号并获取API Key
3. 填入 `.env` 文件的 `XIAOMI_API_KEY`
4. **限时免费**：TTS 模型目前限时免费使用

💡 用于语音合成功能，限时免费

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

## 💡 使用说明

### 基本使用

1. **首次启动** - 按照配置向导填写 API Key
2. **开始对话** - 告诉 Phoenix 你想听什么
3. **享受音乐** - Phoenix 会为你推荐并播放音乐

### 对话示例

```
你：早上好
Phoenix：早上好！今天天气不错，来首轻快的晴天开启美好的一天吧

你：我想听陶喆的歌
Phoenix：好的，为你推荐陶喆的经典歌曲

你：心情有点低落
Phoenix：理解你的感受，来听些温暖治愈的歌吧

你：推荐一些我没怎么听过的冷门歌曲
Phoenix：好的，为你挖掘一些宝藏音乐
```

### 反馈系统

- 👍 **喜欢** - 告诉AI你喜欢这首歌，以后会推荐类似的
- 👎 **不喜欢** - 告诉AI你不喜欢，以后会避免推荐
- ⭐ **收藏** - 收藏喜欢的歌曲，方便以后查找

### 播放控制

- ▶️ **播放/暂停**
- ⏮️ **上一首**
- ⏭️ **下一首**
- ⏹️ **停止**
- 🔊 **音量调节**
- 📋 **播放列表**
- ⭐ **收藏夹**

---

### 高级功能

#### 导入音乐库

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

或者在前端界面：
1. 打开配置面板
2. 验证网易云 Cookie
3. 点击"导入我的音乐库"
4. 选择导入模式（重新导入/增量更新）

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

1. 打开 DJ 个人资料
2. 选择主动对话级别：
   - **安静模式（Quiet）** - 60分钟检查一次
   - **低频模式（Medium）** - 20分钟检查一次
   - **高频模式（Active）** - 15分钟检查一次

#### TTS 语音模式

1. 打开配置面板
2. 配置 TTS 设置
3. 选择播放模式：
   - **DJ 模式** - 先说话再放歌
   - **音乐模式** - 点击播放语音
   - **安静模式** - 完全关闭语音

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

## 🔧 常见问题

### Q1: 配置保存后重启丢失？
**A:** 最新版本已修复，配置会保存到 `.env` 文件，重启不会丢失。

### Q2: 收藏夹清除缓存后丢失？
**A:** 最新版本已修复，收藏数据会同步到后端，清除缓存也能恢复。

### Q3: 无法播放VIP歌曲？
**A:** 需要配置网易云音乐Cookie，且Cookie对应的账号需要是VIP会员。

### Q4: AI回复很慢？
**A:** DeepSeek API响应时间约1-3秒，这是正常的。如果超过10秒，检查网络连接和API Key是否有效。

### Q5: Cookie过期了怎么办？
**A:** 重新按照教程获取Cookie，更新 `.env` 文件，重启服务即可。

### Q6: TTS 语音不播放？
**A:** 检查：
1. 是否配置了小米 API Key
2. TTS 是否启用
3. TTS 模式是否为"DJ 模式"

### Q7: 如何修改 AI DJ 的名字？
**A:** 修改以下文件中的名字：
- `prompts/dj-persona.md`
- `src/brain/deepseek.js`
- 前端组件中的显示名称

### Q8: 数据存储在哪里？
**A:** 所有数据存储在本地：
- 后端数据：`data/state.json`
- 前端数据：浏览器 LocalStorage
- 完全隐私，不会上传到任何服务器

### Q9: 推荐的歌曲都是热门歌曲，如何推荐冷门歌曲？
**A:** 在对话中明确表达你的需求，例如："推荐一些我没怎么听过的歌"、"来点小众的音乐"、"不要太热门的"。AI会自动识别并筛选冷门歌曲。

### Q10: 如何测试推荐系统？
**A:** 运行测试脚本：
```bash
node test-recommendation.js
```

---

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- 赛博朋克风格CSS
- LocalStorage（数据持久化）

### 后端
- **Node.js** - JavaScript 运行时
- **Express** - Web 应用框架
- **WebSocket** - 实时通信

### AI & 服务
- **DeepSeek AI** - 大语言模型
- **LangChain** - AI应用开发框架，提供对话记忆和上下文管理
- **网易云音乐 API** - 音乐数据源
- **小米 MiMo TTS** - 语音合成
- **TF-IDF** - 本地向量搜索

### AI Prompt工程
- DJ人设设计
- 意图识别
- 上下文管理
- 反馈学习

### 推荐系统
- 混合推荐策略（70% 探索 + 30% 舒适区）
- 相似推荐算法
- 热度筛选
- 智能意图识别

---

## 📂 项目结构

```
AI-FM/
├── frontend/              # 前端 Vue 3 应用
│   ├── src/
│   │   ├── components/   # Vue 组件
│   │   ├── utils/        # 工具函数
│   │   └── style.css     # 样式文件
│   └── dist/             # 构建产物
├── src/                  # 后端源码
│   ├── index.js         # 主服务器入口
│   ├── brain/           # AI 大脑模块
│   │   ├── deepseek.js          # DeepSeek适配器
│   │   ├── langchain-adapter.js # LangChain适配器
│   │   ├── state.js             # 状态管理
│   │   ├── router.js            # 路由分流器
│   │   ├── context.js           # 上下文构建器
│   │   ├── scheduler.js         # 定时调度器
│   │   ├── tts.js               # 小米TTS语音合成
│   │   ├── proactive.js         # 主动对话系统
│   │   ├── music-vector-store.js # 音乐向量存储（RAG）
│   │   ├── agent.js             # Agent工具系统
│   │   └── recommendation-strategy.js # 推荐策略模块
│   ├── music/           # 音乐服务模块
│   │   └── ncm.js      # 网易云音乐API
│   └── services/        # 外部服务集成
│       ├── weather.js  # 天气服务
│       └── feishu.js   # 飞书日历
├── prompts/             # AI 提示词
│   └── dj-persona.md   # DJ人设
├── user/                # 用户配置
│   ├── taste.md        # 音乐品味
│   ├── routines.md     # 作息规则
│   └── mood-rules.md   # 心情规则
├── netease-api/         # 网易云音乐 API
├── data/                # 数据存储
│   └── state.json      # 状态数据
├── cache/               # 缓存目录
├── scripts/             # 工具脚本
│   └── import-music-history.js  # 音乐库导入
└── .env                 # 环境变量配置
```

---

## 🤝 贡献

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

### 灵感来源

特别感谢 **mmguo** 博主，本项目的灵感来源于她的创意和分享！

- 小红书：[@mmguo](https://www.xiaohongshu.com/user/profile/55a508e8c2bdeb432f5763e2)

### 核心技术

- [DeepSeek](https://www.deepseek.com/) - 提供强大的AI推理能力
- [LangChain](https://github.com/langchain-ai/langchainjs) - AI应用开发框架，提供对话记忆和上下文管理
- [网易云音乐API](https://github.com/Binaryify/NeteaseCloudMusicApi) - 音乐数据来源

### 前端技术

- [Vue.js 3](https://vuejs.org/) - 渐进式前端框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具

### 后端技术

- [Node.js](https://nodejs.org/) - JavaScript运行时
- [Express](https://expressjs.com/) - Web应用框架
- [WebSocket](https://github.com/websockets/ws) - 实时通信

### 可选服务

- [小米 MiMo](https://platform.xiaomimimo.com/) - 语音合成服务（限时免费）
- [OpenWeather](https://openweathermap.org/) - 天气数据服务
- [飞书开放平台](https://open.feishu.cn/) - 日历集成

特别感谢所有为开源社区做出贡献的开发者们！

---

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/shenhuatian/AI-FM/issues)
- **Discussions**: [GitHub Discussions](https://github.com/shenhuatian/AI-FM/discussions)

---

## 🌟 Star History

如果这个项目对你有帮助，请给个 Star ⭐️

---

<div align="center">

**Made with ❤️ by [shenhuatian](https://github.com/shenhuatian)**

**Powered by DeepSeek AI**

</div>
