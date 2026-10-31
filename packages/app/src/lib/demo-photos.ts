import type { Photo } from '@/types/photo'
import { GPSDirection } from '@/types/map'

const DEMO_STOPS = [
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, color: ['#38bdf8', '#2563eb'], width: 800, height: 1200 },
  { name: 'Hakone', latitude: 35.2324, longitude: 139.1069, color: ['#a78bfa', '#7c3aed'], width: 1200, height: 800 },
  { name: 'Kyoto', latitude: 35.0116, longitude: 135.7681, color: ['#fb7185', '#e11d48'], width: 900, height: 1200 },
  { name: 'Osaka', latitude: 34.6937, longitude: 135.5023, color: ['#fbbf24', '#ea580c'], width: 1200, height: 900 },
  { name: 'Nara', latitude: 34.6851, longitude: 135.8048, color: ['#34d399', '#047857'], width: 800, height: 1200 },
  { name: 'Kobe', latitude: 34.6901, longitude: 135.1956, color: ['#22d3ee', '#0e7490'], width: 1200, height: 800 },
]

async function createDemoImage({ name, color: colors, width, height }: typeof DEMO_STOPS[number], index: number): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context)
    throw new Error('Canvas is unavailable')

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(1, colors[1])
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = 'rgba(255,255,255,0.16)'
  context.beginPath()
  context.arc(width * 0.78, height * 0.16, Math.min(width, height) * 0.32, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fff'
  context.font = '600 72px system-ui, sans-serif'
  context.textAlign = 'center'
  context.fillText(name, canvas.width / 2, canvas.height / 2)
  context.font = '32px system-ui, sans-serif'
  context.fillStyle = 'rgba(255,255,255,0.82)'
  context.fillText(`Demo journey · Day ${index + 1}`, canvas.width / 2, canvas.height / 2 + 58)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Failed to create demo image')), 'image/jpeg', 0.9)
  })

  return new File([blob], `locusify-demo-${name.toLowerCase()}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.UTC(2026, 3, 10 + index, 9, 0, 0),
  })
}

export async function createDemoPhotos(): Promise<Photo[]> {
  return Promise.all(DEMO_STOPS.map(async (stop, index) => {
    const file = await createDemoImage(stop, index)
    return {
      id: `locusify-demo-${stop.name.toLowerCase()}`,
      file,
      preview: URL.createObjectURL(file),
      width: stop.width,
      height: stop.height,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      dateTaken: new Date(file.lastModified).toISOString(),
      camera: { make: 'Locusify', model: 'Demo Journey' },
      gpsInfo: {
        latitude: stop.latitude,
        longitude: stop.longitude,
        latitudeRef: GPSDirection.North,
        longitudeRef: GPSDirection.East,
      },
    }
  }))
}
