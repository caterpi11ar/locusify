/**
 * 开发环境测试数据生成工具
 * 用于在开发模式下快速填充虚假照片和 GPS 数据
 */

import type { PhotoGpsData, UploadedPhoto } from '@/types/workspace'

/**
 * 测试照片的 GPS 坐标数据
 * 模拟一次从北京到上海的旅行路线
 */
const MOCK_GPS_COORDINATES = [
  {
    name: '北京天安门',
    latitude: 39.9042,
    longitude: 116.4074,
    altitude: 44,
  },
  {
    name: '天津之眼',
    latitude: 39.1467,
    longitude: 117.1633,
    altitude: 3,
  },
  {
    name: '济南趵突泉',
    latitude: 36.6612,
    longitude: 117.0219,
    altitude: 51,
  },
  {
    name: '南京夫子庙',
    latitude: 32.0236,
    longitude: 118.7969,
    altitude: 10,
  },
  {
    name: '上海外滩',
    latitude: 31.2397,
    longitude: 121.4912,
    altitude: 4,
  },
]

/**
 * 生成虚假的照片 File 对象
 */
async function createMockPhotoFile(index: number): Promise<File> {
  // 创建一个简单的 1x1 像素的 JPEG 图片 (红色)
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const ctx = canvas.getContext('2d')

  if (ctx) {
    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 800, 600)
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
    gradient.addColorStop(0, colors[index % colors.length])
    gradient.addColorStop(1, colors[(index + 1) % colors.length])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 600)

    // 添加文字标识
    ctx.fillStyle = 'white'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`测试照片 ${index + 1}`, 400, 250)
    ctx.font = '24px Arial'
    ctx.fillText(MOCK_GPS_COORDINATES[index].name, 400, 350)
  }

  // 将 canvas 转换为 Blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `test-photo-${index + 1}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now() - (MOCK_GPS_COORDINATES.length - index) * 3600000, // 每张照片间隔1小时
        })
        resolve(file)
      }
    }, 'image/jpeg', 0.9)
  })
}

/**
 * 生成测试用的 UploadedPhoto 数组
 */
export async function generateMockPhotos(): Promise<UploadedPhoto[]> {
  const photos: UploadedPhoto[] = []

  for (let i = 0; i < MOCK_GPS_COORDINATES.length; i++) {
    const file = await createMockPhotoFile(i)
    const photo: UploadedPhoto = {
      id: `mock-photo-${i + 1}-${Date.now()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      createdAt: new Date(file.lastModified),
    }
    photos.push(photo)
  }

  return photos
}

/**
 * 生成测试用的 GPS 数据
 */
export function generateMockGpsData(photos: UploadedPhoto[]): PhotoGpsData[] {
  return photos.map((photo, index) => {
    const coords = MOCK_GPS_COORDINATES[index]
    const timestamp = new Date(photo.file.lastModified)

    return {
      photoId: photo.id,
      photo,
      gps: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
      },
      timestamp,
      locationName: coords.name,
      hasValidGps: true,
    }
  })
}
