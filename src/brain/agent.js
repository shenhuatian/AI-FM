// Agent 系统 - 让 AI 自主决策调用工具
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import musicVectorStore from './music-vector-store.js';

/**
 * 创建音乐搜索工具
 */
export function createSearchMusicTool() {
  return new DynamicStructuredTool({
    name: 'search_music',
    description: '在用户的音乐库中搜索歌曲。支持按歌曲名、艺术家名、专辑名搜索。',
    schema: z.object({
      query: z.string().describe('搜索关键词，可以是歌曲名、艺术家名或专辑名'),
      limit: z.number().optional().default(10).describe('返回结果数量，默认 10')
    }),
    func: async ({ query, limit }) => {
      try {
        const results = await musicVectorStore.semanticSearch(query, limit);
        if (results.length === 0) {
          return `未找到与 "${query}" 相关的歌曲`;
        }
        return JSON.stringify(results.map(song => ({
          name: song.name,
          artist: song.artist,
          album: song.album
        })));
      } catch (error) {
        return `搜索失败: ${error.message}`;
      }
    }
  });
}

/**
 * 创建按艺术家搜索工具
 */
export function createSearchByArtistTool() {
  return new DynamicStructuredTool({
    name: 'search_by_artist',
    description: '按艺术家名称搜索歌曲。当用户明确要求某个艺术家的歌曲时使用。',
    schema: z.object({
      artist: z.string().describe('艺术家名称'),
      limit: z.number().optional().default(10).describe('返回结果数量，默认 10')
    }),
    func: async ({ artist, limit }) => {
      try {
        const results = musicVectorStore.searchByArtist(artist, limit);
        if (results.length === 0) {
          return `未找到艺术家 "${artist}" 的歌曲`;
        }
        return JSON.stringify(results.map(song => ({
          name: song.name,
          artist: song.artist,
          album: song.album
        })));
      } catch (error) {
        return `搜索失败: ${error.message}`;
      }
    }
  });
}

/**
 * 创建按心情搜索工具
 */
export function createSearchByMoodTool() {
  return new DynamicStructuredTool({
    name: 'search_by_mood',
    description: '根据心情搜索适合的歌曲。支持的心情：开心、悲伤、平静、激动、浪漫、怀旧。',
    schema: z.object({
      mood: z.enum(['开心', '悲伤', '平静', '激动', '浪漫', '怀旧']).describe('用户的心情'),
      limit: z.number().optional().default(10).describe('返回结果数量，默认 10')
    }),
    func: async ({ mood, limit }) => {
      try {
        const results = await musicVectorStore.searchByMood(mood, limit);
        if (results.length === 0) {
          return `未找到适合 "${mood}" 心情的歌曲`;
        }
        return JSON.stringify(results.map(song => ({
          name: song.name,
          artist: song.artist,
          album: song.album
        })));
      } catch (error) {
        return `搜索失败: ${error.message}`;
      }
    }
  });
}

/**
 * 创建获取用户偏好工具
 */
export function createGetUserPreferencesTool(stateManager) {
  return new DynamicStructuredTool({
    name: 'get_user_preferences',
    description: '获取用户的音乐偏好，包括喜欢和不喜欢的歌曲、收藏的歌曲。',
    schema: z.object({}),
    func: async () => {
      try {
        const state = stateManager.getState();
        const preferences = {
          favorites: state.favorites || [],
          liked: state.feedback?.filter(f => f.type === 'like').map(f => f.song_name) || [],
          disliked: state.feedback?.filter(f => f.type === 'dislike').map(f => f.song_name) || []
        };
        return JSON.stringify(preferences);
      } catch (error) {
        return `获取偏好失败: ${error.message}`;
      }
    }
  });
}

/**
 * 创建检查播放历史工具
 */
export function createCheckPlayHistoryTool(stateManager) {
  return new DynamicStructuredTool({
    name: 'check_play_history',
    description: '检查用户最近播放的歌曲，避免重复推荐。',
    schema: z.object({
      limit: z.number().optional().default(10).describe('查看最近多少首歌，默认 10')
    }),
    func: async ({ limit }) => {
      try {
        const state = stateManager.getState();
        const recentPlays = (state.plays || [])
          .slice(-limit)
          .map(play => ({
            name: play.song_name,
            artist: play.artist,
            played_at: play.played_at
          }));
        return JSON.stringify(recentPlays);
      } catch (error) {
        return `获取历史失败: ${error.message}`;
      }
    }
  });
}

/**
 * 创建随机推荐工具
 */
export function createGetRandomSongsTool() {
  return new DynamicStructuredTool({
    name: 'get_random_songs',
    description: '从用户音乐库中随机获取歌曲。当用户说"随便听听"、"随机播放"时使用。',
    schema: z.object({
      count: z.number().optional().default(5).describe('随机歌曲数量，默认 5')
    }),
    func: async ({ count }) => {
      try {
        const results = musicVectorStore.getRandomSongs(count);
        return JSON.stringify(results.map(song => ({
          name: song.name,
          artist: song.artist,
          album: song.album
        })));
      } catch (error) {
        return `获取随机歌曲失败: ${error.message}`;
      }
    }
  });
}

/**
 * 创建所有工具
 */
export function createAllTools(stateManager) {
  return [
    createSearchMusicTool(),
    createSearchByArtistTool(),
    createSearchByMoodTool(),
    createGetUserPreferencesTool(stateManager),
    createCheckPlayHistoryTool(stateManager),
    createGetRandomSongsTool()
  ];
}
