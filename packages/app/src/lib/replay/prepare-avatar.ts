import { isBrandAvatar } from '@/lib/brand'

let cached: { url: string, result: Promise<string> } | undefined

/** Read the real avatar in the browser; canvas security cannot be bypassed. */
export function prepareReplayAvatar(url: string): Promise<string> {
  if (!url || isBrandAvatar(url))
    return Promise.resolve('')
  if (cached?.url === url)
    return cached.result
  const result = snapshotAvatar(url).catch(() => {
    if (cached?.url === url)
      cached = undefined
    throw new Error('avatar-unavailable')
  })
  cached = { url, result }
  return result
}

async function snapshotAvatar(url: string): Promise<string> {
  let data = url
  if (!url.startsWith('data:')) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), credentials: 'same-origin', referrerPolicy: 'no-referrer' })
    if (!response.ok)
      throw new Error('avatar-unavailable')
    const blob = await response.blob()
    data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }
  const image = new Image()
  image.src = data
  await image.decode()
  return data
}
