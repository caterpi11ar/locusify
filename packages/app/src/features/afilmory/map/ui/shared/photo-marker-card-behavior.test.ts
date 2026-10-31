import assert from 'node:assert/strict'
import { it } from 'vitest'

import { resolvePhotoMarkerCardBehavior } from './photo-marker-card-behavior'

it('selected photo marker uses a map-anchored card instead of forcing a portal hover card open', () => {
  assert.deepEqual(resolvePhotoMarkerCardBehavior({ isSelected: true }), {
    hoverCardCloseDelay: 100,
    hoverCardOpen: undefined,
    hoverCardOpenDelay: 400,
    renderAnchoredCard: true,
  })
})

it('unselected photo marker keeps ordinary hover preview behavior', () => {
  assert.deepEqual(resolvePhotoMarkerCardBehavior({ isSelected: false }), {
    hoverCardCloseDelay: 100,
    hoverCardOpen: undefined,
    hoverCardOpenDelay: 400,
    renderAnchoredCard: false,
  })
})
