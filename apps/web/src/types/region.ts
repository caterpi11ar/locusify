export interface RegionPhotoEntry {
  regionId: string // ISO_A3 or ADM0_A3 code (e.g. "USA", "CHN")
  regionName: string // e.g. "United States of America"
  photoId: string
  photoUrl: string // blob URL
}
