// 头像管理工具

/**
 * 获取头像
 * @returns {string|null} base64 图片数据或 null
 */
export const getAvatar = () => {
  return localStorage.getItem('dj_avatar') || null
}

/**
 * 设置头像
 * @param {string} base64 - base64 图片数据
 */
export const setAvatar = (base64) => {
  localStorage.setItem('dj_avatar', base64)
}

/**
 * 压缩图片
 * @param {File} file - 图片文件
 * @param {number} maxWidth - 最大宽度（默认 200px）
 * @param {number} quality - 压缩质量（0-1，默认 0.8）
 * @returns {Promise<string>} 压缩后的 base64 图片
 */
export const compressImage = (file, maxWidth = 200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      reject(new Error('请上传图片文件'))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // 计算压缩后的尺寸（保持宽高比）
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')

        // 使用白色背景（处理透明图片）
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为 base64（JPEG 格式，压缩质量 0.8）
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)

        resolve(compressedBase64)
      }

      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }

      img.src = e.target.result
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

export default {
  getAvatar,
  setAvatar,
  compressImage
}
