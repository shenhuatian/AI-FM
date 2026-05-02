// 收藏夹管理工具

const FAVORITES_KEY = 'song_favorites'

/**
 * 获取所有收藏
 * @returns {Array} 收藏的歌曲列表
 */
export const getAllFavorites = () => {
  try {
    const data = localStorage.getItem(FAVORITES_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('获取收藏数据失败:', error)
    return []
  }
}

/**
 * 检查歌曲是否已收藏
 * @param {string} songId - 歌曲 ID
 * @returns {boolean}
 */
export const isFavorited = (songId) => {
  const favorites = getAllFavorites()
  return favorites.some(item => item.id === songId)
}

/**
 * 添加到收藏夹（同步到后端）
 * @param {Object} song - 歌曲对象 { id, name, artist, album, url, albumPic }
 */
export const addFavorite = async (song) => {
  try {
    // 先保存到 LocalStorage（降级方案）
    const favorites = getAllFavorites()

    // 检查是否已收藏
    if (isFavorited(song.id)) {
      console.log('⚠️ 歌曲已在收藏夹中')
      return false
    }

    const favoriteItem = {
      id: song.id,
      name: song.name,
      artist: song.artist,
      album: song.album || '',
      url: song.url,
      albumPic: song.albumPic || null,
      addedAt: new Date().toISOString()
    }

    favorites.unshift(favoriteItem) // 添加到开头
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))

    // 同步到后端
    try {
      const response = await fetch('/api/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song: favoriteItem })
      })

      if (!response.ok) {
        console.warn('后端同步失败，但本地已保存')
      } else {
        console.log(`⭐ 已同步到后端: ${song.name} - ${song.artist}`)
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已保存:', apiError)
    }

    console.log(`⭐ 已收藏: ${song.name} - ${song.artist}`)

    // 触发收藏更新事件
    window.dispatchEvent(new Event('favorites-updated'))
    return true
  } catch (error) {
    console.error('添加收藏失败:', error)
    return false
  }
}

/**
 * 从收藏夹移除（同步到后端）
 * @param {string} songId - 歌曲 ID
 */
export const removeFavorite = async (songId) => {
  try {
    // 先从 LocalStorage 移除
    let favorites = getAllFavorites()
    favorites = favorites.filter(item => item.id !== songId)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))

    // 同步到后端
    try {
      const response = await fetch(`/api/favorite/${songId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.warn('后端同步失败，但本地已删除')
      } else {
        console.log(`🗑️ 已从后端移除: ${songId}`)
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已删除:', apiError)
    }

    console.log('🗑️ 已从收藏夹移除')

    // 触发收藏更新事件
    window.dispatchEvent(new Event('favorites-updated'))
    return true
  } catch (error) {
    console.error('移除收藏失败:', error)
    return false
  }
}

/**
 * 切换收藏状态
 * @param {Object} song - 歌曲对象
 * @returns {boolean} 收藏后的状态
 */
export const toggleFavorite = (song) => {
  if (isFavorited(song.id)) {
    removeFavorite(song.id)
    return false
  } else {
    addFavorite(song)
    return true
  }
}

/**
 * 清空收藏夹（同步到后端）
 */
export const clearAllFavorites = async () => {
  try {
    // 先清空 LocalStorage
    localStorage.removeItem(FAVORITES_KEY)

    // 同步到后端
    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.warn('后端同步失败，但本地已清空')
      } else {
        console.log('🗑️ 已从后端清空收藏夹')
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已清空:', apiError)
    }

    console.log('🗑️ 已清空收藏夹')

    // 触发收藏更新事件
    window.dispatchEvent(new Event('favorites-updated'))
  } catch (error) {
    console.error('清空收藏夹失败:', error)
  }
}

/**
 * 获取收藏数量
 * @returns {number}
 */
export const getFavoritesCount = () => {
  return getAllFavorites().length
}

export default {
  getAllFavorites,
  isFavorited,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  clearAllFavorites,
  getFavoritesCount
}
