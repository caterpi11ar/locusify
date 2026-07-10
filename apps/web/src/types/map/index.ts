import type { Tags } from 'exiftool-vendored'

/**
 * GPS Cardinal directions enum
 */
export enum GPSDirection {
  North = 'N',
  South = 'S',
  East = 'E',
  West = 'W',
}

// 影调类型定义
export type ToneType = 'low-key' | 'high-key' | 'normal' | 'high-contrast'

/**
 * Enhanced GPS coordinates interface with altitude and direction
 */
export interface GPSCoordinates {
  latitude: number
  longitude: number
  altitude?: number
  latitudeRef?: GPSDirection.North | GPSDirection.South
  longitudeRef?: GPSDirection.East | GPSDirection.West
  altitudeRef?: 'Above Sea Level' | 'Below Sea Level'
}

export interface FujiRecipe {
  FilmMode:
    | 'F0/Standard (Provia)'
    | 'F1/Studio Portrait'
    | 'F1a/Studio Portrait Enhanced Saturation'
    | 'F1b/Studio Portrait Smooth Skin Tone (Astia)'
    | 'F1c/Studio Portrait Increased Sharpness'
    | 'F2/Fujichrome (Velvia)'
    | 'F3/Studio Portrait Ex'
    | 'F4/Velvia'
    | 'Pro Neg. Std'
    | 'Pro Neg. Hi'
    | 'Classic Chrome'
    | 'Eterna'
    | 'Classic Negative'
    | 'Bleach Bypass'
    | 'Nostalgic Neg'
    | 'Reala ACE'
  GrainEffectRoughness: 'Off' | 'Weak' | 'Strong'
  GrainEffectSize: 'Off' | 'Small' | 'Large'
  ColorChromeEffect: 'Off' | 'Weak' | 'Strong'
  ColorChromeFxBlue: 'Off' | 'Weak' | 'Strong'
  WhiteBalance:
    | 'Auto'
    | 'Auto (white priority)'
    | 'Auto (ambiance priority)'
    | 'Daylight'
    | 'Cloudy'
    | 'Daylight Fluorescent'
    | 'Day White Fluorescent'
    | 'White Fluorescent'
    | 'Warm White Fluorescent'
    | 'Living Room Warm White Fluorescent'
    | 'Incandescent'
    | 'Flash'
    | 'Underwater'
    | 'Custom'
    | 'Custom2'
    | 'Custom3'
    | 'Custom4'
    | 'Custom5'
    | 'Kelvin'
  /**
   * White balance fine tune adjustment (e.g., "Red +0, Blue +0")
   */
  WhiteBalanceFineTune: string
  DynamicRange: 'Standard' | 'Wide'
  /**
   * Highlight tone adjustment (e.g., "+2 (hard)", "0 (normal)", "-1 (medium soft)")
   */
  HighlightTone: string
  /**
   * Shadow tone adjustment (e.g., "-2 (soft)", "0 (normal)")
   */
  ShadowTone: string
  /**
   * Saturation adjustment (e.g., "+4 (highest)", "0 (normal)", "-2 (low)")
   */
  Saturation: string
  /**
   * Sharpness setting (e.g., "Normal", "Hard", "Soft")
   */
  Sharpness: string
  /**
   * Noise reduction setting (e.g., "0 (normal)", "-1 (medium weak)")
   */
  NoiseReduction: string
  /**
   * Clarity adjustment (typically 0)
   */
  Clarity: number
  /**
   * Color temperature setting (e.g., "5000", "6500")
   */
  ColorTemperature: Tags['ColorTemperatureAuto']
  /**
   * Development dynamic range setting (e.g., "100", "200")
   */
  DevelopmentDynamicRange: number
  /**
   * Dynamic range setting (e.g., Auto, Manual, Standard, Wide1, Wide2, Film Simulation)
   */
  DynamicRangeSetting: Tags['DynamicRangeSetting']
}

export interface PickedExif {
  // 时区和时间相关
  zone?: string
  tz?: string
  tzSource?: string

  // 基本相机信息
  Orientation?: number
  Make?: string
  Model?: string
  Software?: string
  Artist?: string
  Copyright?: string

  // 曝光相关
  ExposureTime?: string | number
  FNumber?: number
  ExposureProgram?: string
  ISO?: number
  ShutterSpeedValue?: string | number
  ApertureValue?: number
  BrightnessValue?: number
  ExposureCompensation?: number
  MaxApertureValue?: number

  // 时间偏移
  OffsetTime?: string
  OffsetTimeOriginal?: string
  OffsetTimeDigitized?: string

  // 光源和闪光灯
  LightSource?: string
  Flash?: string

  // 焦距相关
  FocalLength?: string | number
  FocalLengthIn35mmFormat?: string | number

  // 镜头相关
  LensMake?: string
  LensModel?: string

  // 颜色和拍摄模式
  ColorSpace?: string
  ExposureMode?: string
  SceneCaptureType?: string

  // 计算字段
  Aperture?: number
  ScaleFactor35efl?: number
  ShutterSpeed?: string | number
  LightValue?: number

  // 日期时间（处理后的 ISO 格式或 Date 对象）
  DateTimeOriginal?: string | Date
  DateTimeDigitized?: string | Date
  CreateDate?: string | Date

  // 图像尺寸
  ImageWidth?: number
  ImageHeight?: number

  // GPS coordinates (exifr processed fields - decimal degrees)
  latitude?: number
  longitude?: number
  altitude?: number

  // GPS 原始字段 (支持 exiftool-vendored Tags 类型)
  MeteringMode?: Tags['MeteringMode']
  WhiteBalance?: Tags['WhiteBalance']
  WBShiftAB?: Tags['WBShiftAB']
  WBShiftGM?: Tags['WBShiftGM']
  WhiteBalanceBias?: Tags['WhiteBalanceBias']

  FlashMeteringMode?: Tags['FlashMeteringMode']
  SensingMethod?: Tags['SensingMethod']
  FocalPlaneXResolution?: Tags['FocalPlaneXResolution']
  FocalPlaneYResolution?: Tags['FocalPlaneYResolution']
  GPSAltitude?: Tags['GPSAltitude']
  GPSLatitude?: Tags['GPSLatitude']
  GPSLongitude?: Tags['GPSLongitude']
  GPSAltitudeRef?: Tags['GPSAltitudeRef']
  GPSLatitudeRef?: Tags['GPSLatitudeRef']
  GPSLongitudeRef?: Tags['GPSLongitudeRef']

  // 富士胶片配方
  FujiRecipe?: FujiRecipe

  // HDR 相关
  MPImageType?: Tags['MPImageType']

  // 评分
  Rating?: number
}

// 影调分析结果
export interface ToneAnalysis {
  toneType: ToneType
  brightness: number // 0-100，平均亮度
  contrast: number // 0-100，对比度
  shadowRatio: number // 0-1，阴影区域占比
  highlightRatio: number // 0-1，高光区域占比
}

export interface PhotoInfo {
  title: string
  dateTaken: string
  tags: string[]
  description: string
}

// Video source sum type: Live Photo or Motion Photo
export type VideoSource
  = | { type: 'live-photo', videoUrl: string }
    | { type: 'motion-photo', imageUrl: string, offset: number, size?: number, presentationTimestamp?: number }
    | { type: 'video', videoUrl: string }
    | { type: 'none' }

/** Photo manifest item interface */
export interface PhotoManifestItem extends PhotoInfo {
  id: string
  originalUrl: string
  thumbnailUrl: string
  thumbHash: string | null
  width: number
  height: number
  aspectRatio: number
  s3Key: string
  lastModified: string
  size: number
  exif: PickedExif | null
  toneAnalysis: ToneAnalysis | null
  video?: VideoSource
  isHDR?: boolean
}
/**
 * Photo marker interface for map display
 */
export interface PhotoMarker {
  id: string
  longitude: number
  latitude: number
  altitude?: number
  latitudeRef?: GPSDirection.North | GPSDirection.South
  longitudeRef?: GPSDirection.East | GPSDirection.West
  altitudeRef?: 'Above Sea Level' | 'Below Sea Level'

  photo: PhotoManifestItem
}

/**
 * Map bounds interface
 */
export interface MapBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  centerLat: number
  centerLng: number
  bounds: [[number, number], [number, number]]
}

/**
 * Map view state interface
 */
export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
}
