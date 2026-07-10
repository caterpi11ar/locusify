/**
 * Shared rendering constants for the waypoint dot / avatar.
 * Consumed by WaypointDot (DOM) and useVideoRecorder (Canvas 2D)
 * to keep the two rendering paths visually consistent.
 *
 * Pure data — no rendering logic.
 */

// ─── Avatar (profile image or preset circle) ─────────────────────────────────

export const AVATAR_SIZE_PX = 36 // matches size-9 (9 × 4 = 36)
export const AVATAR_BORDER_WIDTH = 2
export const AVATAR_BORDER_COLOR = '#38bdf8' // sky-400
export const AVATAR_GLOW_COLOR = 'rgba(56,189,248,0.4)'
export const AVATAR_GLOW_BLUR = 8

// ─── Profile fallback (initial letter) ────────────────────────────────────────

export const PROFILE_FALLBACK_BG = '#38bdf8' // sky-400
export const PROFILE_FALLBACK_TEXT = '#ffffff'
export const PROFILE_FALLBACK_FONT_RATIO = 0.5

// ─── Preset avatar ────────────────────────────────────────────────────────────

export const PRESET_ICON_SIZE_RATIO = 5 / 9 // 20px icon in 36px circle

// ─── Default blue dot (type === 'none') ───────────────────────────────────────

export const DEFAULT_DOT_SIZE_PX = 12 // matches size-3 (3 × 4 = 12)
export const DEFAULT_DOT_COLOR = '#38bdf8' // sky-400
export const DEFAULT_DOT_GLOW_COLOR = 'rgba(56,189,248,0.6)'
export const DEFAULT_DOT_GLOW_BLUR = 8

// ─── Transport badge ─────────────────────────────────────────────────────────

export const BADGE_SIZE_PX = 16 // diameter, matches size-4
export const BADGE_ICON_SIZE_PX = 10 // matches size-2.5
export const BADGE_BG_COLOR = 'rgba(40,40,40,0.72)' // approximates bg-material-thick (dark)
export const BADGE_ICON_COLOR = 'rgba(255,255,255,0.85)' // approximates text-text (dark)

// ─── Photo card (replay floating card) ──────────────────────────────────────

/** Default pixel offset from waypoint to card anchor (CSS px) */
export const PHOTO_CARD_OFFSET = { dx: 140, dy: -120 } as const
/** Smaller offset for mobile / narrow viewports */
export const PHOTO_CARD_OFFSET_SM = { dx: 90, dy: -75 } as const
/** Dashed connector stroke color */
export const CONNECTOR_COLOR = 'rgba(56,189,248,0.35)'
/** Dashed connector dash pattern [dash, gap] */
export const CONNECTOR_DASH = [4, 3] as const
/** Dashed connector stroke width */
export const CONNECTOR_STROKE_WIDTH = 1

// ─── Canvas scaling ───────────────────────────────────────────────────────────

/** Reference width for canvas scale factor: scale = canvasWidth / REFERENCE_WIDTH */
export const REFERENCE_WIDTH = 600
