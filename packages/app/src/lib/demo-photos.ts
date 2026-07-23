import type { Photo } from '@/types/photo'
import { GPSDirection } from '@/types/map'

const DEMO_STOPS = [
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, color: ['#38bdf8', '#2563eb'] },
  { name: 'Hakone', latitude: 35.2324, longitude: 139.1069, color: ['#a78bfa', '#7c3aed'] },
  { name: 'Kyoto', latitude: 35.0116, longitude: 135.7681, color: ['#fb7185', '#e11d48'] },
  { name: 'Osaka', latitude: 34.6937, longitude: 135.5023, color: ['#fbbf24', '#ea580c'] },
]

async function createDemoImage(name: string, index: number, colors: string[]): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 800
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
  context.arc(940, 130, 260, 0, Math.PI * 2)
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
    const file = await createDemoImage(stop.name, index, stop.color)
    return {
      id: `locusify-demo-${stop.name.toLowerCase()}`,
      file,
      preview: URL.createObjectURL(file),
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
