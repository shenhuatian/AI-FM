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
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已保存:', apiError)
    }

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
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已删除:', apiError)
    }

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
      }
    } catch (apiError) {
      console.warn('后端API调用失败，但本地已清空:', apiError)
    }

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

/**
 * 从后端加载收藏数据（初始化时调用）
 */
export const loadFavoritesFromBackend = async () => {
  try {
    const response = await fetch('/api/favorites')
    if (response.ok) {
      const data = await response.json()
      const backendFavorites = data.favorites || []

      // 合并本地和后端数据（去重）
      const localFavorites = getAllFavorites()
      const mergedFavorites = mergeFavorites(localFavorites, backendFavorites)

      // 保存合并后的数据到 localStorage
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(mergedFavorites))

      console.log('✅ 已从后端加载收藏数据:', mergedFavorites.length, '首')
      return mergedFavorites
    }
  } catch (error) {
    console.warn('从后端加载收藏失败，使用本地数据:', error)
    return getAllFavorites()
  }
}

/**
 * 合并本地和后端收藏数据（去重）
 */
const mergeFavorites = (local, backend) => {
  const merged = [...local]
  const localIds = new Set(local.map(f => f.id))

  // 添加后端有但本地没有的
  backend.forEach(song => {
    if (!localIds.has(song.id)) {
      merged.push(song)
    }
  })

  // 按添加时间排序
  merged.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))

  return merged
}

export default {
  getAllFavorites,
  isFavorited,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  clearAllFavorites,
  getFavoritesCount,
  loadFavoritesFromBackend
}
