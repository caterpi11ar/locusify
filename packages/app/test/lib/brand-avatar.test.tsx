import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProfileAvatar } from '../../src/components/ui/profile-avatar'
import { brandLogo } from '../../src/lib/brand'

describe('profile avatar branding', () => {
  it.each([brandLogo, '/assets/locusify-previousBuild.png', '/src/assets/locusify.png'])(
    'renders current artwork and brand corners for local fallback %s',
    (src) => {
      const html = renderToStaticMarkup(<ProfileAvatar src={src} alt="Profile" className="size-9 rounded-full object-cover" />)
      expect(html).toContain(`src="${brandLogo}"`)
      expect(html).toContain('rounded-[30%]')
      expect(html).toContain('[corner-shape:superellipse(1.45)]')
      expect(html).not.toContain('rounded-full')
    },
  )

  it.each(['https://example.com/assets/locusify-personal.png', 'blob:personal-avatar', 'data:image/png;base64,AA=='])(
    'preserves the source and styling of personal avatar %s',
    (src) => {
      const html = renderToStaticMarkup(<ProfileAvatar src={src} alt="Profile" className="size-9 rounded-full object-cover" />)
      expect(html).toContain(`src="${src}"`)
      expect(html).toContain('rounded-full')
      expect(html).not.toContain('corner-shape')
    },
  )
})
