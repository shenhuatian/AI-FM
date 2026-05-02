// 歌曲反馈管理工具

const FEEDBACK_KEY = 'song_feedback'

/**
 * 获取所有反馈
 * @returns {Object} 反馈数据对象
 */
export const getAllFeedback = () => {
  try {
    const data = localStorage.getItem(FEEDBACK_KEY)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('获取反馈数据失败:', error)
    return {}
  }
}

/**
 * 获取某首歌的反馈
 * @param {string} songId - 歌曲 ID
 * @returns {string|null} 'like' | 'dislike' | null
 */
export const getFeedback = (songId) => {
  const allFeedback = getAllFeedback()
  return allFeedback[songId]?.feedback || null
}

/**
 * 设置歌曲反馈（同步到后端）
 * @param {string} songId - 歌曲 ID
 * @param {string} songName - 歌曲名称
 * @param {string} artist - 艺术家
 * @param {string} feedback - 'like' | 'dislike'
 */
export const setFeedback = async (songId, songName, artist, feedback) => {
  try {
    // 先保存到 LocalStorage（降级方案）
    const allFeedback = getAllFeedback()
    allFeedback[songId] = {
      songId,
      songName,
      artist,
      feedback,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(allFeedback))

    // 同步到后端
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, songName, artist, feedback })
      })

      if (!response.ok) {
        console.warn('后端同步失败，但本地已保存')
      } else {
        console.log(`✅ 反馈已同步到后端: ${songName} - ${feedback}`)
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已保存:', apiError)
    }

    console.log(`✅ 反馈已保存: ${songName} - ${feedback}`)
  } catch (error) {
    console.error('保存反馈失败:', error)
  }
}

/**
 * 移除歌曲反馈（同步到后端）
 * @param {string} songId - 歌曲 ID
 */
export const removeFeedback = async (songId) => {
  try {
    // 先从 LocalStorage 移除
    const allFeedback = getAllFeedback()
    delete allFeedback[songId]
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(allFeedback))

    // 同步到后端
    try {
      const response = await fetch(`/api/feedback/${songId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.warn('后端同步失败，但本地已删除')
      } else {
        console.log(`✅ 反馈已从后端删除: ${songId}`)
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已删除:', apiError)
    }
  } catch (error) {
    console.error('移除反馈失败:', error)
  }
}

/**
 * 获取喜欢的歌曲列表
 * @returns {Array} 喜欢的歌曲列表
 */
export const getLikedSongs = () => {
  const allFeedback = getAllFeedback()
  return Object.values(allFeedback)
    .filter(item => item.feedback === 'like')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

/**
 * 获取不喜欢的歌曲列表
 * @returns {Array} 不喜欢的歌曲列表
 */
export const getDislikedSongs = () => {
  const allFeedback = getAllFeedback()
  return Object.values(allFeedback)
    .filter(item => item.feedback === 'dislike')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

/**
 * 清除所有反馈
 */
export const clearAllFeedback = () => {
  try {
    localStorage.removeItem(FEEDBACK_KEY)
    console.log('🗑️ 已清除所有反馈')
  } catch (error) {
    console.error('清除反馈失败:', error)
  }
}

export default {
  getAllFeedback,
  getFeedback,
  setFeedback,
  removeFeedback,
  getLikedSongs,
  getDislikedSongs,
  clearAllFeedback
}
