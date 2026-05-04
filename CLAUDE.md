# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📝 最近完成的工作

### 🎉 推荐系统优化（2026-05-04）

实现了完整的混合推荐策略（70% 探索 + 30% 舒适区），让 AI DJ 能够推荐更多样化的音乐。

#### 新增功能

1. **网易云 API 扩展** (`src/music/ncm.js`)
   - `getSimilarSongs(songId, limit)`: 获取相似歌曲推荐
   - `getSimilarArtists(artistId, limit)`: 获取相似艺术家推荐
   - `getArtistTopSongs(artistId, limit)`: 获取艺术家热门歌曲（含热度信息）
   - `searchArtist(keyword, limit)`: 搜索艺术家

2. **推荐策略模块** (`src/brain/recommendation-strategy.js`)
   - `hybridRecommend()`: 混合推荐（70% 网易云搜索 + 30% 音乐库）
   - `smartRecommend()`: 智能推荐（自动意图识别）
   - `filterByPopularity()`: 热度筛选（支持冷门/热门歌曲）
   - 自动识别：艺术家、心情、冷门偏好

3. **主流程集成** (`src/index.js`)
   - 自动补充推荐：当找到的歌曲少于目标数量时，自动使用相似推荐补充
   - 去重优化：按歌曲名称去重，避免同一首歌的不同版本重复

#### 优化效果

- ✅ 推荐多样性：从 200 首音乐库扩展到数百万首网易云歌曲
- ✅ 推荐准确性：自动补充相似歌曲，保证推荐数量
- ✅ 冷门歌曲发现：支持热度筛选，推荐冷门但高质量的歌曲
- ✅ 用户体验：找不到歌曲时不再返回空列表

详细文档：`RECOMMENDATION-UPGRADE.md`  
测试脚本：`test-recommendation.js`

---

### ✅ 切换到小米 MiMo V2.5 TTS（2026-05-03）

### ✅ 切换到小米 MiMo V2.5 TTS
- 创建了 `src/brain/tts-xiaomi.js`，实现小米 MiMo TTS 集成
- 替换了 Fish Audio TTS（因为网络限制和余额问题）
- 支持 OpenAI 兼容的 API 接口
- 支持代理配置（`HTTPS_PROXY` / `HTTP_PROXY`）
- 支持多种音色：`default_zh`（中文女声）、`default_en`（英文女声）、`mimo_default`
- 支持风格标签：情绪、方言、角色扮演、特殊风格
- 支持音频标签：在文本中插入音频事件
- 创建了 `test-xiaomi-tts.js` 测试脚本
- 创建了 `XIAOMI-TTS-SETUP.md` 配置指南
- 更新了 `.env` 和 `.env.example` 配置

**优势：**
- 国内服务，访问速度快
- 价格友好
- 丰富的中文语音风格
- 易于集成和部署

### ✅ 配置 Fish Audio TTS 服务（已废弃）
- 添加了默认声音 ID：`168931532`（曼波 - 男性、年轻）
- 修改了 `src/brain/tts.js`，添加了 `reference_id` 参数到所有 API 请求
- 安装并集成了 `https-proxy-agent` 包，支持代理访问
- 添加了代理配置支持（`HTTPS_PROXY` 和 `HTTP_PROXY` 环境变量）
- 创建了 `TTS-SETUP.md` 配置指南文档
- 创建了 `test-tts.js` 测试脚本

**废弃原因：** Fish Audio API 需要代理访问，且账户余额不足（402 错误）

### ✅ 构建音乐库向量存储（RAG）
- 创建了 `src/brain/music-vector-store.js`
- 实现了基于 TF-IDF 的本地语义搜索（不依赖外部 API）
- 支持按歌曲名、艺术家、心情搜索
- 集成到主流程，启动时自动加载用户音乐库（200 首歌曲）

### ✅ 构建 Agent 工具系统
- 创建了 `src/brain/agent.js`
- 定义了 6 个工具：
  - `search_music`: 语义搜索歌曲
  - `search_by_artist`: 按艺术家搜索
  - `search_by_mood`: 按心情搜索
  - `get_user_preferences`: 获取用户偏好
  - `check_play_history`: 检查播放历史
  - `get_random_songs`: 随机推荐
- 使用 LangChain 的 DynamicStructuredTool 和 zod schema

### ✅ 集成 LangChain 对话记忆系统
- 创建了 `src/brain/langchain-adapter.js`
- 实现了自动对话记忆管理（保留最近 10 轮对话）
- AI 现在能理解完整的对话历史和上下文
- 修复了对话上下文理解问题（用户说"这些太热门了"时，AI 能理解指的是上一轮推荐）

### ✅ 修复的技术问题
- 修复了 LangChain API 配置（`apiKey` 和 `model` 参数）
- 修复了网易云 API 的 `anonymous_token` 文件缺失问题
- 改进了歌曲搜索的错误处理和日志
- 更新了 README.md 致谢部分

---

## Project Overview

Claudio FM is an AI-powered music DJ system that uses DeepSeek AI to understand user preferences and recommend music based on mood, time, weather, and context. It features a Vue 3 frontend with a cyberpunk aesthetic and a Node.js backend with WebSocket support for real-time communication.

## Development Commands

### Starting the Application

```bash
# Start all services (NCM API, Backend, Frontend)
npm run dev

# Or use the Windows batch script
start-all.bat

# Start services individually
npm run start:ncm      # Netease Cloud Music API (port 3000)
npm run start:backend  # Backend server (port 8080)
npm run start:frontend # Frontend dev server (port 3030)
```

### Other Commands

```bash
npm run build:frontend  # Build frontend for production
npm run import:music    # Import user's Netease Cloud Music library
npm test               # Run configuration tests
```

## Architecture

### Four-Layer Architecture

1. **External Context Layer** (`src/music/`, `src/services/`)
   - `NeteaseCloudMusic`: Music search and playback
   - `WeatherService`: Weather data for mood-based recommendations
   - `FeishuCalendarService`: Calendar integration for schedule-aware music

2. **Local Brain Layer** (`src/brain/`)
   - `DeepSeekAdapter`: AI decision-making engine
   - `StateManager`: Persistent state management (plays, messages, preferences, feedback)
   - `Router`: Intent classification and request routing
   - `ContextBuilder`: Assembles context from various sources
   - `ProactiveAgent`: Autonomous conversation system
   - `Scheduler`: Time-based music recommendations

3. **API Layer** (`src/index.js`)
   - Express REST API
   - WebSocket server for real-time updates
   - Handles chat, music playback, feedback, favorites

4. **Frontend Layer** (`frontend/src/`)
   - Vue 3 SPA with cyberpunk aesthetic
   - Real-time WebSocket connection
   - LocalStorage for client-side persistence

### Key Data Flow

**User Message → AI Response:**
1. User sends message via WebSocket or HTTP POST `/api/chat`
2. `Router.route()` classifies intent (chat vs music request)
3. `ContextBuilder.build()` assembles context (time, weather, play history, user preferences)
4. `DeepSeekAdapter.decide()` calls AI with context + conversation history
5. AI returns JSON: `{ say, play, reason, segue }`
6. Backend searches songs via `NeteaseCloudMusic.findSong()`
7. **Deduplication**: Songs are deduplicated by **song name** (case-insensitive) to avoid recommending the same song with different artist orders
8. Response sent to frontend with songs + audio URLs

**Proactive Conversation:**
1. `ProactiveAgent` runs on a timer (5-30 min intervals based on user settings)
2. Checks triggers (idle time, special hours, playlist ending, etc.)
3. Calls `DeepSeekAdapter.decideProactive()` to decide if AI should speak
4. If yes, broadcasts message via WebSocket to all connected clients

### State Management

**Backend State** (`data/state.json`):
- `plays`: Play history with completion/skip tracking
- `messages`: Conversation history (last 100)
- `preferences`: Learned user preferences (artists, time slots)
- `feedback`: User likes/dislikes
- `favorites`: User's favorite songs
- `proactiveSettings`: Proactive conversation settings (level, quiet hours)
- `proactiveMessages`: History of proactive messages
- `proactiveStats`: Response rate tracking

**Frontend State** (LocalStorage):
- Chat messages
- Current playlist
- User feedback
- Favorites

## Critical Implementation Details

### Song Deduplication

**Problem**: Same song can appear multiple times with different artist orders (e.g., "陶喆/蔡依林" vs "蔡依林/陶喆")

**Solution** (`src/index.js` lines 106-126):
```javascript
const seenSongNames = new Set();
if (!seenSongNames.has(song.name.toLowerCase())) {
  songs.push(song);
  seenSongNames.add(song.name.toLowerCase());
}
```

### Intent Classification

**Router** (`src/brain/router.js`) uses keyword matching to classify user intent:
- `definitely_chat`: User wants to chat only (no music)
- `definitely_music`: User explicitly requests music
- `uncertain`: Let AI decide

Keywords for "fresh/deep cuts" (`src/brain/deepseek.js`):
- "没怎么听过", "小众", "冷门", "深度" → Recommend B-sides, not hits

### Proactive Conversation

**Time Intervals** (`src/brain/proactive.js`):
- `active`: 5 minutes
- `medium`: 15 minutes
- `quiet`: 30 minutes

**Triggers**:
- Idle time > 30 min
- Special hours (7, 9, 12, 14, 18, 21)
- Playlist ending
- Multiple skips (≥3)

**Response Rate Adaptation**: If user ignores proactive messages (response rate < 30%), interval doubles.

### UI Interaction Pattern

**Feedback Buttons** (`frontend/src/components/ChatSection.vue`):
- Buttons (👍/👎/⭐) only appear when a song from that message is **currently playing**
- Uses `currentPlayingSongId` prop to determine which song is active
- Clicking a song card plays that song and updates `currentPlayingSongId`

### Error Handling

**Frontend Play Errors** (`frontend/src/App.vue`):
- Max 3 consecutive play errors before stopping
- Counter resets on successful play
- Prevents infinite loop when backend/NCM API fails

## AI Prompt Engineering

### System Prompt Structure (`src/brain/deepseek.js`)

1. **DJ Persona** (`prompts/dj-persona.md`): Personality, speaking style
2. **User Taste** (`user/taste.md`): Preferred genres, artists
3. **User Routines** (`user/routines.md`): Daily schedule and music preferences
4. **Mood Rules** (`user/mood-rules.md`): Mood-to-music mappings
5. **Music Library** (`user/my-music-library.json`): User's Netease Cloud Music data (if imported)
6. **User Habits**: Analyzed from play history (favorite artists, time slot preferences)
7. **User Preferences**: Learned from feedback (likes/dislikes) and favorites
8. **Recent Play History**: Last 10 songs to avoid repetition
9. **Keyword Recognition Rules**: Artist identification, freshness detection, exclusion rules

### Critical Prompt Rules

**Keyword Recognition** (highest priority):
- Artist: "XX的歌" → Only recommend that artist
- Freshness: "没怎么听过" → Recommend deep cuts, avoid hits
- Exclusion: Never recommend recently played songs (last 10) or disliked songs

**Output Format**:
```json
{
  "say": "20-40 chars, natural, friendly",
  "play": ["Song1 - Artist1", "Song2 - Artist2", ...],
  "reason": "Why recommend the first song",
  "segue": ""
}
```

## Configuration

### Required Environment Variables

```env
DEEPSEEK_API_KEY=sk-...  # Required for AI functionality
```

### Recommended Environment Variables

```env
NCM_COOKIE=...  # Netease Cloud Music cookie for VIP songs
```

### Optional Environment Variables

```env
FISH_API_KEY=...           # TTS voice synthesis
OPENWEATHER_API_KEY=...    # Weather-based recommendations
FEISHU_APP_ID=...          # Calendar integration
FEISHU_APP_SECRET=...
```

## Common Issues

### NCM API Not Starting

**Problem**: `netease-api/api-enhanced-main/server.js` exports functions but doesn't start server.

**Solution**: Added auto-start code at end of file:
```javascript
if (require.main === module) {
  serveNcmApi({ port: 3000 })
}
```

### WebSocket Connection Loop

**Problem**: Frontend repeatedly connects/disconnects to WebSocket.

**Solution**: Check that backend is running on port 8080 and WebSocket path is `/stream`.

### Proactive Conversation Not Working

**Problem**: AI never speaks proactively.

**Checklist**:
1. Check `proactiveSettings.level` in `data/state.json` (not "quiet")
2. Verify `ProactiveAgent.start()` is called in `src/index.js`
3. Check console for "🤖 主动对话系统已启动" and "⏰ 下次主动检查将在 X 分钟后"
4. Ensure `broadcastCallback` is set via `setBroadcastCallback()`

### Same Song Recommended Multiple Times

**Problem**: Song appears with different artist orders.

**Solution**: Deduplication now uses song name (case-insensitive) instead of song ID.

## File Modification Guidelines

### When Modifying AI Behavior

1. **Prompt Changes**: Edit `prompts/dj-persona.md` or system prompt in `src/brain/deepseek.js`
2. **Intent Classification**: Modify `src/brain/router.js` keyword lists
3. **Context**: Add new context sources in `src/brain/context.js`

### When Adding New Music Sources

1. Create adapter in `src/music/` following `ncm.js` pattern
2. Implement: `search()`, `getSongUrl()`, `findSong()`
3. Update `src/index.js` to use new adapter

### When Modifying State Schema

1. Update `StateManager` class in `src/brain/state.js`
2. Add migration logic if needed (check existing state structure)
3. Update `data/state.json` structure documentation

## Testing

Currently minimal automated testing. Manual testing workflow:

1. Start all services
2. Test chat: "给我推荐一些陶喆的歌吧，我想要听一些我没怎么听过的"
3. Verify: No duplicate songs, deep cuts recommended (not hits)
4. Test feedback: Click song to play, then use 👍/👎/⭐ buttons
5. Test proactive: Wait for configured interval, check for AI message

## Performance Considerations

- **DeepSeek API**: ~1-3s response time per request
- **Song Search**: Sequential search for each song in `play` array (can be slow with 5+ songs)
- **State Persistence**: Writes to `data/state.json` on every state change (consider debouncing for high-frequency updates)
- **WebSocket**: One connection per browser tab (consider connection pooling for production)
