import type { Photo } from '../../src/types/photo'
import { afterEach, expect, it, vi } from 'vitest'
import { photoToManifestItem, usePhotoStore } from '../../src/stores/photoStore'

function photo(id: string, preview: string): Photo {
  return { id, preview, file: new File(['synthetic'], 'test.jpg'), name: 'test.jpg', size: 9, type: 'image/jpeg', lastModified: 0, width: 1200, height: 800 }
}
afterEach(() => {
  usePhotoStore.getState().clearPhotos()
  vi.restoreAllMocks()
})
it('keeps photos without GPS and their decoded ratio without inventing a date', () => {
  usePhotoStore.getState().addPhotos([photo('a', 'blob:a')])
  expect(usePhotoStore.getState().photos).toHaveLength(1)
  expect(usePhotoStore.getState().markers).toHaveLength(0)
  expect(photoToManifestItem(usePhotoStore.getState().photos[0])).toMatchObject({ width: 1200, height: 800, aspectRatio: 1.5, dateTaken: '' })
})
it('releases rejected duplicate URLs while retaining the accepted preview', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  usePhotoStore.getState().addPhotos([photo('a', 'blob:accepted'), photo('a', 'blob:rejected')])
  usePhotoStore.getState().addPhotos([photo('a', 'blob:accepted')])
  expect(usePhotoStore.getState().photos).toHaveLength(1)
  expect(revoke.mock.calls).toEqual([['blob:rejected']])
  usePhotoStore.getState().setSelectedMarkerId('a')
  usePhotoStore.getState().removePhoto('a')
  expect(usePhotoStore.getState().selectedMarkerId).toBeNull()
  expect(revoke).toHaveBeenCalledWith('blob:accepted')
})
