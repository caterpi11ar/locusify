import type { FC } from 'react'
import type { Components } from 'react-markdown'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Spinner } from '@/components/ui/spinner'
import { cn, glassPanel } from '@/lib/utils'

type LegalType = 'privacy-policy' | 'terms-of-service'

interface LegalDrawerProps {
  type: LegalType
  open: boolean
  onOpenChange: (open: boolean) => void
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

export const LegalDrawer: FC<LegalDrawerProps> = ({ type, open, onOpenChange }) => {
  const { t } = useTranslation()
  const { data: content, isLoading } = useLegalContent(type)

  const title = type === 'privacy-policy'
    ? t('auth.legal.privacyPolicy.title')
    : t('auth.legal.termsOfService.title')

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95dvh] sm:max-h-[80vh] border-none bg-transparent backdrop-blur-none">
        <DrawerHeader className="hidden">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{title}</DrawerDescription>
        </DrawerHeader>
        <div className={cn(glassPanel, 'flex flex-col overflow-hidden rounded-t-2xl')}>
          <div className="flex-1 overflow-y-auto p-4 pb-safe">
            <div className="mb-3 text-center">
              <h2 className="text-text text-lg font-semibold">{title}</h2>
            </div>
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
      </DrawerContent>
    </Drawer>
  )
}
