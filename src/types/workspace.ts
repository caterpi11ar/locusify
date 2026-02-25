/**
 * 工作区照片管理和轨迹回放的核心类型定义
 */
import type { GPSCoordinates } from '@/types/map'

/**
 * 照片对象及其元数据
 */
export interface UploadedPhoto {
  /** 照片唯一标识符 (UUID) */
  id: string
  /** 原始文件对象 */
  file: File
  /** 预览用的对象 URL */
  previewUrl: string
  /** 文件大小（字节） */
  size: number
  /** 文件 MIME 类型（如 image/jpeg, image/heic） */
  mimeType: string
  /** 创建时间 */
  createdAt: Date
}

/**
 * 包含提取的 GPS 数据的照片
 */
export interface PhotoGpsData {
  /** 照片 ID */
  photoId: string
  /** 照片对象引用 */
  photo: UploadedPhoto
  /** GPS 坐标数据（可能为空） */
  gps: GPSCoordinates | null
  /** 拍摄时间（来自 EXIF DateTimeOriginal） */
  timestamp: Date
  /** 逆地理编码位置名称 */
  locationName?: string
  /** 是否包含有效的 GPS 数据 */
  hasValidGps: boolean
  /** GPS 提取错误信息 */
  extractionError?: string
}

/**
 * GPS 提取错误信息
 */
export interface PhotoGpsError {
  /** 照片 ID */
  photoId: string
  /** 照片文件名 */
  photoName: string
  /** 错误类型 */
  errorType: 'no_exif' | 'no_gps' | 'invalid_format' | 'extraction_failed'
  /** 错误消息 */
  errorMessage: string
}

/**
 * 轨迹路径点
 */
export interface TrajectoryWaypoint {
  /** 路径点唯一标识符 */
  id: string
  /** 位置坐标 [经度, 纬度] */
  position: [number, number]
  /** 关联的照片 ID */
  photoId: string
  /** 照片对象引用 */
  photo: UploadedPhoto
  /** 时间戳 */
  timestamp: Date
  /** 位置名称 */
  locationName?: string
  /** 在轨迹中的顺序索引 */
  index: number
}

/**
 * 回放状态
 */
export interface PlaybackState {
  /** 回放状态：空闲 | 播放中 | 暂停 | 已完成 */
  status: 'idle' | 'playing' | 'paused' | 'completed'
  /** 当前路径点索引 */
  currentWaypointIndex: number
  /** 当前段落进度（0-1） */
  segmentProgress: number
  /** 总体进度（0-1） */
  totalProgress: number
  /** 速度倍率 */
  speedMultiplier: number
}

/**
 * 工作区步骤类型（1-3）
 */
export type WorkspaceStep = 1 | 2 | 3
