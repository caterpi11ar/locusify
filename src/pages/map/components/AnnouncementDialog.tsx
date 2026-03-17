import type { Components } from 'react-markdown'
import pkg from '@pkg'
import { useQuery } from '@tanstack/react-query'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { fetchReleaseNotes } from '@/lib/release-notes'
import { cn, glassPanel } from '@/lib/utils'

interface AnnouncementDialogProps {
  open: boolean
  onClose: () => void
}

const mdComponents: Components = {
  h1: () => null,
  blockquote: () => null,
  h2: ({ children }) => <h2 className="text-text mt-2 mb-1 text-sm font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="text-text mt-1.5 mb-0.5 text-xs font-semibold">{children}</h3>,
  p: ({ children }) => <p className="my-0.5">{children}</p>,
  ul: ({ children }) => <ul className="my-0.5 list-disc pl-4">{children}</ul>,
  li: ({ children }) => <li className="my-0">{children}</li>,
  code: ({ children }) => <code className="bg-fill-tertiary rounded px-1 text-xs">{children}</code>,
}

function useReleaseNotes() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'zh-CN' ? 'zh-CN' : 'en'

  return useQuery({
    queryKey: ['release-notes', pkg.version, lang],
    queryFn: () => fetchReleaseNotes(pkg.version, lang),
    staleTime: Infinity,
    retry: false,
  })
}

export function AnnouncementDialog({ open, onClose }: AnnouncementDialogProps) {
  const { t } = useTranslation()
  const { data: content, isLoading } = useReleaseNotes()

  if (!open)
    return null

  return (
    <m.div
      className="absolute inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <m.div
        className={cn(glassPanel, 'relative w-72 overflow-hidden sm:w-80')}
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15">
            <i className="i-mingcute-announcement-line text-xl text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-text text-sm font-semibold leading-tight">
              {t('map.announcement.title')}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="bg-fill-tertiary mx-4 h-px" />

        {/* Body */}
        <div className="max-h-60 overflow-y-auto px-5 py-4">
          {isLoading
            ? (
                <div className="flex justify-center py-4">
                  <div className="border-text-tertiary size-5 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              )
            : content
              ? (
                  <div className="text-text-secondary text-sm leading-relaxed">
                    <Markdown components={mdComponents}>
                      {content}
                    </Markdown>
                  </div>
                )
              : (
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {t('map.announcement.body')}
                  </p>
                )}
        </div>

        {/* Divider */}
        <div className="bg-fill-tertiary mx-4 h-px" />

        {/* Actions */}
        <div className="p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          >
            {t('map.announcement.dismiss')}
          </button>
        </div>
      </m.div>
    </m.div>
  )
}
