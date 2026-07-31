import type { Tags } from 'exiftool-vendored'
import type { PickedExif } from '@/types/map'
import { isNil } from 'es-toolkit'

/**
 * exifr 解析结果类型
 */
interface ExifrResult {
  // 时区和时间
  tz?: string
  tzSource?: string
  DateTimeOriginal?: string | Date
  DateTimeDigitized?: string | Date
  CreateDate?: string | Date
  OffsetTime?: string
  OffsetTimeOriginal?: string
  OffsetTimeDigitized?: string

  // 基本信息
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

  // 光源和闪光灯
  LightSource?: string
  Flash?: string

  // 焦距
  FocalLength?: string | number
  FocalLengthIn35mmFormat?: string | number

  // 镜头
  LensMake?: string
  LensModel?: string

  // 颜色和模式
  ColorSpace?: string
  ExposureMode?: string
  SceneCaptureType?: string

  // 计算字段
  Aperture?: number
  ScaleFactor35efl?: number
  ShutterSpeed?: string | number
  LightValue?: number

  // 图像尺寸
  ExifImageWidth?: number
  ExifImageHeight?: number
  ImageWidth?: number
  ImageHeight?: number

  // GPS 坐标（exifr 处理后的十进制格式）
  latitude?: number
  longitude?: number
  altitude?: number

  // GPS 原始字段
  GPSLatitude?: number | [number, number, number]
  GPSLongitude?: number | [number, number, number]
  GPSAltitude?: number
  GPSLatitudeRef?: string
  GPSLongitudeRef?: string
  GPSAltitudeRef?: number

  // 测光和白平衡
  MeteringMode?: string
  WhiteBalance?: string
  WBShiftAB?: number
  WBShiftGM?: number
  WhiteBalanceBias?: number

  FlashMeteringMode?: string
  SensingMethod?: string
  FocalPlaneXResolution?: number
  FocalPlaneYResolution?: number

  // 富士胶片配方相关
  FilmMode?: string
  GrainEffectRoughness?: string
  GrainEffectSize?: string
  ColorChromeEffect?: string
  ColorChromeFXBlue?: string
  DynamicRange?: string
  HighlightTone?: string
  ShadowTone?: string
  Saturation?: string
  Sharpness?: string
  NoiseReduction?: string
  Clarity?: number
  ColorTemperature?: Tags['ColorTemperatureAuto']
  DevelopmentDynamicRange?: number
  DynamicRangeSetting?: string

  // 索尼配方相关
  CreativeStyle?: string
  PictureEffect?: string
  Hdr?: string
  SoftSkinEffect?: string

  // HDR 相关
  MPImageType?: string

  // 评分
  Rating?: number
}

/**
 * 浏览器端提取 EXIF 数据
 * 使用 exifr 库从图片文件中提取 EXIF 信息
 * @param file - 图片文件
 * @returns 提取的 EXIF 数据
 */
export async function extractExifData(
  file: File,
): Promise<PickedExif | null> {
  const log = console

  try {
    log.info('开始提取 EXIF 数据:', file.name)
    const { default: exifr } = await import('exifr')

    const exifData = (await exifr.parse(file, {
      gps: true,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
      mergeOutput: true,
      tiff: true,
      xmp: true,
      icc: false,
      iptc: false,
      jfif: false,
    })) as ExifrResult | undefined

    if (!exifData) {
      log.warn('未找到 EXIF 数据:', file.name)
      return null
    }

    const result = handleExifData(exifData)

    log.info('EXIF 数据提取完成:', file.name)
    return result
  }
  catch (error) {
    log.error('提取 EXIF 数据失败:', file.name, error)
    return null
  }
}

const pickKeys = [
  'tz',
  'tzSource',
  'Orientation',
  'Make',
  'Model',
  'Software',
  'Artist',
  'Copyright',
  'ExposureTime',
  'FNumber',
  'ExposureProgram',
  'ISO',
  'OffsetTime',
  'OffsetTimeOriginal',
  'OffsetTimeDigitized',
  'ShutterSpeedValue',
  'ApertureValue',
  'BrightnessValue',
  'ExposureCompensation',
  'MaxApertureValue',
  'LightSource',
  'Flash',
  'FocalLength',
  'ColorSpace',
  'ExposureMode',
  'FocalLengthIn35mmFormat',
  'SceneCaptureType',
  'LensMake',
  'LensModel',
  'MeteringMode',
  'WhiteBalance',
  'WBShiftAB',
  'WBShiftGM',
  'WhiteBalanceBias',
  'FlashMeteringMode',
  'SensingMethod',
  'FocalPlaneXResolution',
  'FocalPlaneYResolution',
  'Aperture',
  'ScaleFactor35efl',
  'ShutterSpeed',
  'LightValue',
  'Rating',
  // GPS
  'GPSAltitude',
  'GPSAltitudeRef',
  'GPSLatitude',
  'GPSLatitudeRef',
  'GPSLongitude',
  'GPSLongitudeRef',
  // HDR相关字段
  'MPImageType',
]

function handleExifData(exifData: ExifrResult): PickedExif {
  const date = {
    DateTimeOriginal: formatExifDate(exifData.DateTimeOriginal),
    DateTimeDigitized: formatExifDate(exifData.DateTimeDigitized),
    OffsetTime: exifData.OffsetTime,
    OffsetTimeOriginal: exifData.OffsetTimeOriginal,
    OffsetTimeDigitized: exifData.OffsetTimeDigitized,
  }

  let FujiRecipe: Record<string, unknown> | undefined
  if (exifData.FilmMode) {
    FujiRecipe = {
      FilmMode: exifData.FilmMode,
      GrainEffectRoughness: exifData.GrainEffectRoughness,
      GrainEffectSize: exifData.GrainEffectSize,
      ColorChromeEffect: exifData.ColorChromeEffect,
      ColorChromeFxBlue: exifData.ColorChromeFXBlue,
      WhiteBalance: exifData.WhiteBalance,
      DynamicRange: exifData.DynamicRange,
      HighlightTone: exifData.HighlightTone,
      ShadowTone: exifData.ShadowTone,
      Saturation: exifData.Saturation,
      NoiseReduction: exifData.NoiseReduction,
      Clarity: exifData.Clarity,
      ColorTemperature: exifData.ColorTemperature,
      DevelopmentDynamicRange: exifData.DevelopmentDynamicRange,
      DynamicRangeSetting: exifData.DynamicRangeSetting,
    }
  }

  let SonyRecipe: Record<string, unknown> | undefined
  if (!isNil(exifData.CreativeStyle)) {
    SonyRecipe = {
      CreativeStyle: exifData.CreativeStyle,
      PictureEffect: exifData.PictureEffect,
      Hdr: exifData.Hdr,
      SoftSkinEffect: exifData.SoftSkinEffect,
    }
  }

  const size = {
    ImageWidth: exifData.ExifImageWidth || exifData.ImageWidth,
    ImageHeight: exifData.ExifImageHeight || exifData.ImageHeight,
  }

  // Add processed GPS coordinates from exifr
  const gps = {
    latitude: exifData.latitude,
    longitude: exifData.longitude,
    altitude: exifData.altitude,
  }

  const result: Record<string, unknown> = {}
  for (const key of pickKeys) {
    const value = exifData[key as keyof ExifrResult]
    if (value !== undefined) {
      result[key] = value
    }
  }

  return {
    ...date,
    ...size,
    ...gps,
    ...result,
    ...(FujiRecipe ? { FujiRecipe } : {}),
    ...(SonyRecipe ? { SonyRecipe } : {}),
  } as PickedExif
}

function formatExifDate(date: string | Date | undefined): string | undefined {
  if (!date) {
    return undefined
  }

  if (typeof date === 'string') {
    try {
      return new Date(date).toISOString()
    }
    catch {
      return date
    }
  }

  if (date instanceof Date) {
    return date.toISOString()
  }

  return undefined
}
