export interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export function getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

/**
 * 用户此前是否已经授权过定位。
 *
 * 用来把「自动定位」限制在已授权的前提下：无条件调用 getCurrentPosition
 * 会在用户刚打开页面、还没做任何操作时就弹出浏览器权限框。
 * 拿不到 Permissions API 时按未授权处理（宁可不自动定位，也不要打断用户）。
 */
export async function isGeolocationGranted(): Promise<boolean> {
  if (!navigator.geolocation || !navigator.permissions?.query)
    return false
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state === 'granted'
  }
  catch {
    return false
  }
}

/** 用户拒绝授权是预期结果，不是异常，调用方不应把它当成错误上报。 */
export function isPermissionDenied(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && (error as GeolocationPositionError).code === 1 // PERMISSION_DENIED
}
