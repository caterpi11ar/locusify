import type { DiscoveryAnswer, DiscoverySource, DiscoveryState } from './api/discovery-source'

interface SurveyStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}
interface SurveyView {
  open: boolean
  submitting: boolean
  failed: boolean
}
type LocalState = 'skip-pending' | 'complete'
const memory = new Map<string, LocalState>()

/** One controller per authenticated account; late replies are ignored on dispose. */
export function createDiscoverySurvey(
  userId: string,
  request: (userId: string, answer?: DiscoveryAnswer) => Promise<DiscoveryState>,
  storage: SurveyStorage,
  onChange: (view: SurveyView) => void,
  onSubmitted?: () => void,
) {
  const key = `locusify-discovery:v1:${userId}`
  let disposed = false
  let reading = false
  let writing = false
  let syncing = false
  let failures = 0
  let retryAt = 0
  let authPaused = false
  let readAt = 0
  let view: SurveyView = { open: false, submitting: false, failed: false }
  function readLocal() {
    try {
      const value = storage.getItem(key)
      if (value === 'skip-pending' || value === 'complete')
        memory.set(key, value)
    }
    catch { /* Storage may be unavailable; keep the in-memory fallback. */ }
    return memory.get(key)
  }
  function remember(value: LocalState) {
    memory.set(key, value)
    try {
      storage.setItem(key, value)
    }
    catch { /* Dismissal must not block the application. */ }
  }
  function update(next: Partial<SurveyView>) {
    if (!disposed) {
      view = { ...view, ...next }
      onChange(view)
    }
  }
  async function syncSkip() {
    if (disposed || syncing || writing || authPaused || Date.now() < retryAt || readLocal() !== 'skip-pending')
      return
    syncing = true
    try {
      const result = await request(userId, { status: 'skipped' })
      if (!disposed && (result.status !== 'pending' || !result.eligible))
        remember('complete')
    }
    catch (error) {
      const status = error instanceof Error && 'status' in error ? error.status : undefined
      if (status === 400 || status === 403)
        remember('complete')
      else if (status === 401)
        authPaused = true
      else
        retryAt = Date.now() + Math.min(30000, 1000 * 2 ** failures++) + Math.random() * 250
    }
    finally { syncing = false }
  }
  async function refresh(authChanged = false) {
    if (authChanged) {
      authPaused = false
      retryAt = 0
      readAt = 0
    }
    if (disposed || reading)
      return
    if (readLocal()) {
      update({ open: false })
      await syncSkip()
      return
    }
    if (Date.now() < readAt)
      return
    readAt = Date.now() + 60000
    reading = true
    try {
      const state = await request(userId)
      if (!disposed && !readLocal()) {
        update({ open: state.eligible && state.status === 'pending' })
        if (state.status === 'submitted' || state.status === 'skipped')
          remember('complete')
      }
    }
    catch { /* An unavailable survey must never block the app. */ }
    finally { reading = false }
  }
  return {
    refresh,
    skip() {
      if (disposed)
        return
      remember('skip-pending')
      update({ open: false, failed: false })
      void syncSkip()
    },
    async submit(source: DiscoverySource) {
      if (disposed || writing || !view.open)
        return
      writing = true
      update({ submitting: true, failed: false })
      try {
        const state = await request(userId, { source })
        if (state.status !== 'submitted' && state.status !== 'skipped')
          throw new Error('Answer was not saved')
        if (!disposed) {
          const showThanks = view.open && state.status === 'submitted'
          remember('complete')
          update({ open: false })
          if (showThanks)
            onSubmitted?.()
        }
      }
      catch {
        update({ failed: view.open })
      }
      finally {
        writing = false
        update({ submitting: false })
        await syncSkip()
      }
    },
    dispose() { disposed = true },
  }
}
