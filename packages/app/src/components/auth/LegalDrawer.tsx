import type { FC } from 'react'
import type { Components } from 'react-markdown'
import { useQuery } from '@tanstack/react-query'
import { Drawer } from 'antd'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { Spinner } from '@/components/ui/spinner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, glassPanel } from '@/lib/utils'

type LegalType = 'privacy-policy' | 'terms-of-service'

interface LegalDrawerProps {
  type: LegalType
  open: boolean
  onOpenChange: (open: boolean) => void
  modal?: boolean
  desktopOffset?: number
}

const mdComponents: Components = {
  h1: ({ children }) => <h1 className="text-text mb-3 text-base font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="text-text mt-4 mb-1.5 text-sm font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="text-text mt-2 mb-1 text-xs font-semibold">{children}</h3>,
  p: ({ children }) => <p className="text-text-secondary my-1 text-xs leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1 list-disc pl-4">{children}</ul>,
  li: ({ children }) => <li className="text-text-secondary my-0.5 text-xs leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="text-text font-semibold">{children}</strong>,
  code: ({ children }) => <code className="bg-fill-tertiary rounded px-1 text-xs">{children}</code>,
}

async function fetchLegalContent(type: LegalType, lang: string): Promise<string> {
  const url = `${import.meta.env.BASE_URL}legal/${type}/${lang}.md`
  const res = await fetch(url)
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function useLegalContent(type: LegalType) {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'zh-CN' ? 'zh-CN' : 'en'

  return useQuery({
    queryKey: ['legal', type, lang],
    queryFn: () => fetchLegalContent(type, lang),
    staleTime: Infinity,
    retry: false,
  })
}

export const LegalDrawer: FC<LegalDrawerProps> = ({ type, open, onOpenChange, modal, desktopOffset = 0 }) => {
  const { t } = useTranslation()
  const { data: content, isLoading } = useLegalContent(type)
  const isMobile = useIsMobile()

  const title = type === 'privacy-policy'
    ? t('auth.legal.privacyPolicy.title')
    : t('auth.legal.termsOfService.title')

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      placement={isMobile ? 'bottom' : 'left'}
      size={isMobile ? 'auto' : 480}
      mask={{ enabled: modal ?? isMobile, closable: modal ?? isMobile }}
      zIndex={!isMobile && modal === false ? 900 : undefined}
      closable={false}
      destroyOnHidden
      rootStyle={!isMobile ? { left: desktopOffset } : undefined}
      styles={{
        wrapper: isMobile ? { maxHeight: '95dvh' } : { height: '100dvh', width: 480 },
        body: { padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
      }}
    >
      <div className={cn(glassPanel, 'pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl sm:rounded-l-none sm:rounded-r-2xl')}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 pb-2">
          <h2 className="text-text text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
            className="bg-fill-secondary hover:bg-fill-tertiary text-text/60 hover:text-text flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-safe">
          {isLoading
            ? (
                <div className="flex justify-center py-8">
                  <Spinner className="size-5" />
                </div>
              )
            : content
              ? (
                  <Markdown components={mdComponents}>
                    {content}
                  </Markdown>
                )
              : null}
        </div>
      </div>
    </Drawer>
  )
}
