import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Locusify',
    short_name: 'Locusify',
    description: 'Turn GPS photos into interactive travel route maps and animated journey replays.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/logo.png', sizes: '1024x1024', type: 'image/png' },
    ],
  }
}
