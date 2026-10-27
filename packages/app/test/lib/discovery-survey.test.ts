import type { DiscoveryAnswer, DiscoveryState } from '../../src/lib/api/discovery-source'
import { describe, expect, it, vi } from 'vitest'
import { createDiscoverySurvey } from '../../src/lib/discovery-survey'

const pending: DiscoveryState = { eligible: true, status: 'pending', source: null }
const skipped: DiscoveryState = { eligible: true, status: 'skipped', source: null }
let sequence = 0
function setup(request = vi.fn<(id: string, answer?: DiscoveryAnswer) => Promise<DiscoveryState>>().mockResolvedValue(pending)) {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
    values.set(key, value)
  } }
  const changed = vi.fn()
  const submitted = vi.fn()
  const id = `survey-test-${++sequence}`
  return { survey: createDiscoverySurvey(id, request, storage, changed, submitted), changed, submitted, request, storage, values, id }
}

describe('discovery survey lifecycle', () => {
  it('thanks once only after a confirmed submission, never on failure or refresh', async () => {
    const h = setup()
    await h.survey.refresh()
    h.request.mockRejectedValueOnce(new Error('offline'))
    await h.survey.submit('bilibili')
    expect(h.submitted).not.toHaveBeenCalled()
    h.request.mockResolvedValue({ ...pending, status: 'submitted', source: 'bilibili' })
    await h.survey.submit('bilibili')
    await h.survey.submit('bilibili')
    await h.survey.refresh()
    expect(h.submitted).toHaveBeenCalledTimes(1)
  })

  it('does not thank a conflicting terminal skip response', async () => {
    const h = setup()
    await h.survey.refresh()
    h.request.mockResolvedValue(skipped)
    await h.survey.submit('bilibili')
    expect(h.submitted).not.toHaveBeenCalled()
  })

  it('does not permanently suppress a temporarily ineligible account', async () => {
    const h = setup(vi.fn().mockResolvedValue({ eligible: false, status: 'ineligible', source: null }))
    await h.survey.refresh()
    h.request.mockResolvedValue(pending)
    await h.survey.refresh(true)
    expect(h.changed).toHaveBeenLastCalledWith({ open: true, submitting: false, failed: false })
    expect(h.values.size).toBe(0)
  })

  it('pauses unauthorized skips until renewed auth and stops forbidden retries', async () => {
    const h = setup()
    await h.survey.refresh()
    h.request.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }))
    h.survey.skip()
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(2))
    await h.survey.refresh()
    expect(h.request).toHaveBeenCalledTimes(2)
    h.request.mockRejectedValue(Object.assign(new Error('ineligible'), { status: 403 }))
    await h.survey.refresh(true)
    expect(h.request).toHaveBeenCalledTimes(3)
    await h.survey.refresh(true)
    expect(h.request).toHaveBeenCalledTimes(3)
    expect([...h.values.values()]).toEqual(['complete'])
  })

  it('opens only for server-confirmed eligible pending accounts', async () => {
    const h = setup()
    await h.survey.refresh()
    expect(h.changed).toHaveBeenLastCalledWith({ open: true, submitting: false, failed: false })
    for (const state of [{ ...pending, eligible: false }, skipped, { ...pending, status: 'submitted' as const, source: 'bilibili' as const }]) {
      const h = setup(vi.fn().mockResolvedValue(state))
      await h.survey.refresh()
      expect(h.changed).toHaveBeenLastCalledWith({ open: false, submitting: false, failed: false })
    }
  })

  it('retains the open survey on submit failure, permits retry and deduplicates clicks', async () => {
    const h = setup()
    await h.survey.refresh()
    h.request.mockRejectedValueOnce(new Error('offline'))
    await h.survey.submit('douyin')
    expect(h.changed).toHaveBeenLastCalledWith({ open: true, submitting: false, failed: true })
    let resolve!: (state: DiscoveryState) => void
    h.request.mockImplementationOnce(() => new Promise((done) => {
      resolve = done
    }))
    const save = h.survey.submit('douyin')
    await h.survey.submit('github')
    expect(h.request).toHaveBeenCalledTimes(3)
    resolve({ ...pending, status: 'submitted', source: 'douyin' })
    await save
    expect(h.changed).toHaveBeenLastCalledWith({ open: false, submitting: false, failed: false })
    await h.survey.refresh()
    expect(h.request).toHaveBeenCalledTimes(3)
  })

  it('dismisses immediately offline, persists an account outbox and syncs after remount', async () => {
    const h = setup()
    await h.survey.refresh()
    h.request.mockRejectedValue(new Error('offline'))
    h.survey.skip()
    expect(h.changed).toHaveBeenLastCalledWith({ open: false, submitting: false, failed: false })
    h.survey.dispose()
    const next = vi.fn().mockResolvedValue(skipped)
    const changed = vi.fn()
    const remount = createDiscoverySurvey(h.id, next, h.storage, changed)
    await remount.refresh()
    expect(next).toHaveBeenCalledWith(h.id, { status: 'skipped' })
    expect([...h.values.values()]).toEqual(['complete'])
    expect(changed).toHaveBeenLastCalledWith({ open: false, submitting: false, failed: false })
    const otherChanged = vi.fn()
    const other = createDiscoverySurvey(`${h.id}-other`, vi.fn().mockResolvedValue(pending), h.storage, otherChanged)
    await other.refresh()
    expect(otherChanged).toHaveBeenLastCalledWith({ open: true, submitting: false, failed: false })
  })

  it('ignores late results after logout/account switch', async () => {
    let resolve!: (state: DiscoveryState) => void
    const h = setup(vi.fn().mockImplementation(() => new Promise((done) => {
      resolve = done
    })))
    const load = h.survey.refresh()
    h.survey.dispose()
    resolve(pending)
    await load
    expect(h.changed).not.toHaveBeenCalled()
  })

  it('queues skip behind an in-flight submission and preserves successful answers', async () => {
    const h = setup()
    await h.survey.refresh()
    let resolve!: (state: DiscoveryState) => void
    h.request.mockImplementationOnce(() => new Promise((done) => {
      resolve = done
    }))
    const save = h.survey.submit('xiaohongshu')
    h.survey.skip()
    expect(h.request).toHaveBeenCalledTimes(2)
    resolve({ ...pending, status: 'submitted', source: 'xiaohongshu' })
    await save
    expect(h.request).toHaveBeenCalledTimes(2)
    expect([...h.values.values()]).toEqual(['complete'])
    expect(h.submitted).not.toHaveBeenCalled()
  })

  it('still dismisses if browser storage throws', async () => {
    const request = vi.fn().mockResolvedValue(pending)
    const changed = vi.fn()
    const storage = { getItem: () => {
      throw new Error('denied')
    }, setItem: () => {
      throw new Error('quota')
    } }
    const survey = createDiscoverySurvey(`blocked-storage-${++sequence}`, request, storage, changed)
    await survey.refresh()
    request.mockRejectedValue(new Error('offline'))
    survey.skip()
    await survey.refresh()
    expect(changed).toHaveBeenLastCalledWith({ open: false, submitting: false, failed: false })
  })
})
