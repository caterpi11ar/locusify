import pkg from '@pkg'

export const ANNOUNCEMENT_VERSION = pkg.version
export const ANNOUNCEMENT_STORAGE_KEY = 'locusify:version'
export const HELP_SEEN_STORAGE_KEY = 'locusify:help-seen'
export const FEEDBACK_STORAGE_KEY = 'locusify:feedback-last-shown'
export const FEEDBACK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
