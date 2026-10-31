import { expect, it } from 'vitest'
import { advanceStar, createStars } from '../src/pages/map/components/StarfieldCanvas'

it('gives every star independent animation state instead of drawing one rotating arc', () => {
  const stars = createStars(1000)
  expect(new Set(stars).size).toBe(1500)
  const nextAngle = stars[1].angle
  stars[0].angle += 1
  expect(stars[1].angle).toBe(nextAngle)
})

it('moves at most 3 CSS pixels in ten seconds at 30, 60 and 144 Hz', () => {
  for (const hz of [30, 60, 144]) {
    for (const radius of [1, 200, 2304]) {
      const star = { orbitRadius: radius, angle: 0, speed: 0.3, alpha: 1 }
      for (let frame = 0; frame < hz * 10; frame++) advanceStar(star, 1000 / hz)
      expect(star.angle * radius).toBeCloseTo(3, 8)
    }
  }
})

it('does not jump forward after a long frame pause', () => {
  const star = { orbitRadius: 1000, angle: 0, speed: 0.3, alpha: 1 }
  advanceStar(star, 60000)
  expect(star.angle * star.orbitRadius).toBeCloseTo(0.03)
})
