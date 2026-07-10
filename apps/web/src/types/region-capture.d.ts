/**
 * Chrome Region Capture API (CropTarget) — Chrome 104+
 * @see https://developer.chrome.com/docs/web-platform/region-capture
 */

declare class CropTarget {
  static fromElement(element: Element): Promise<CropTarget>
}

interface BrowserCaptureMediaStreamTrack extends MediaStreamTrack {
  cropTo: (cropTarget: CropTarget | null) => Promise<void>
}
