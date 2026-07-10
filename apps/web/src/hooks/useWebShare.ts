import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface ShareLinkOptions {
  title: string
  text?: string
  url: string
}

export function useWebShare() {
  const { t } = useTranslation()

  const shareLink = useCallback(async (options: ShareLinkOptions) => {
    try {
      if (navigator.share) {
        await navigator.share(options)
      }
      else {
        await navigator.clipboard.writeText(options.url)
      }
    }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        return
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(options.url)
        toast.success(t('menu.linkCopied', { defaultValue: 'Link copied to clipboard' }))
      }
      catch {
        toast.error(t('share.error', { defaultValue: 'Failed to share' }))
      }
    }
  }, [t])

  return { shareLink }
}
