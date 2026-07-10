import { AnimatePresence, m } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { submitFeedback } from '@/lib/api/feedback'
import { cn, glassPanel } from '@/lib/utils'

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { t } = useTranslation()
  const [done, setDone] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [showRequired, setShowRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const needsFeedback = rating >= 1 && rating <= 2

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDone(false)
      setRating(0)
      setHoveredStar(0)
      setFeedbackText('')
      setShowRequired(false)
      setSubmitting(false)
    }
  }, [open])

  // Auto-dismiss thank-you after 2s
  useEffect(() => {
    if (!done)
      return
    const timer = setTimeout(onClose, 2000)
    return () => clearTimeout(timer)
  }, [done, onClose])

  const handleSubmit = useCallback(async () => {
    if (needsFeedback && !feedbackText.trim()) {
      setShowRequired(true)
      return
    }

    setSubmitting(true)
    try {
      await submitFeedback({
        rating,
        ...(feedbackText.trim() && { description: feedbackText.trim() }),
      })
      setDone(true)
    }
    catch {
      // Close dialog on failure — don't block user flow
      onClose()
    }
    finally {
      setSubmitting(false)
    }
  }, [rating, needsFeedback, feedbackText, onClose])

  if (!open)
    return null

  return (
    <m.div
      className="pointer-events-none absolute inset-0 z-50 flex items-end justify-end p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <m.div
        className={cn(glassPanel, 'pointer-events-auto relative w-80 overflow-hidden')}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 28 }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="text-text-tertiary hover:text-text-secondary absolute top-3 right-3 z-10 transition-colors"
        >
          <i className="i-mingcute-close-line text-base" />
        </button>

        <AnimatePresence mode="wait">
          {!done
            ? (
                <m.div
                  key="rating"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/15">
                      <i className="i-mingcute-star-fill text-lg text-amber-400" />
                    </div>
                    <div className="min-w-0 pr-5">
                      <p className="text-text text-sm font-semibold leading-tight">
                        {t('feedback.title')}
                      </p>
                      <p className="text-text-secondary mt-0.5 text-xs">
                        {t('feedback.subtitle')}
                      </p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex justify-between px-4 py-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} star`}
                        className="flex flex-1 justify-center transition-transform hover:scale-110 active:scale-95"
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => setRating(star)}
                      >
                        <i
                          className={cn(
                            'text-3xl transition-colors',
                            (hoveredStar || rating) >= star
                              ? 'i-mingcute-star-fill text-amber-400'
                              : 'i-mingcute-star-line text-text-tertiary',
                          )}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Inline feedback textarea for low ratings */}
                  <AnimatePresence>
                    {needsFeedback && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3">
                          <p className="text-text-secondary mb-1.5 text-xs">
                            {t('feedback.textLabel')}
                          </p>
                          <textarea
                            className={cn(
                              'bg-fill-secondary text-text placeholder:text-text-tertiary w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                              showRequired && !feedbackText.trim()
                                ? 'border-red-400'
                                : 'border-fill-tertiary focus:border-sky-400',
                            )}
                            rows={3}
                            placeholder={t('feedback.textPlaceholder')}
                            value={feedbackText}
                            onChange={(e) => {
                              setFeedbackText(e.target.value)
                              if (showRequired)
                                setShowRequired(false)
                            }}
                          />
                          {showRequired && !feedbackText.trim() && (
                            <p className="mt-1 text-xs text-red-400">
                              {t('feedback.textRequired')}
                            </p>
                          )}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex gap-2 px-4 pb-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-text-tertiary text-xs transition-opacity hover:opacity-80"
                    >
                      {t('feedback.skip')}
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={rating === 0 || submitting}
                      className="rounded-lg bg-sky-400 px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40"
                    >
                      {submitting ? '...' : t('feedback.submit')}
                    </button>
                  </div>
                </m.div>
              )
            : (
                <m.div
                  key="thankyou"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3 px-4 py-5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
                      <i className="i-mingcute-check-circle-fill text-xl text-emerald-400" />
                    </div>
                    <div className="min-w-0 pr-5">
                      <p className="text-text text-sm font-semibold leading-tight">
                        {t('feedback.thankYou.title')}
                      </p>
                      <p className="text-text-secondary mt-0.5 text-xs">
                        {t('feedback.thankYou.body')}
                      </p>
                    </div>
                  </div>
                </m.div>
              )}
        </AnimatePresence>
      </m.div>
    </m.div>
  )
}
