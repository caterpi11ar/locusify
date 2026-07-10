import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from '@/locales/en.json'
import zh from '@/locales/zh-CN.json'

export const langs = ['en', 'zh-CN'] as const

export const ns = ['app'] as const

export const defaultNS = 'app' as const

const resources = {
  'en': {
    app: en,
  },
  'zh-CN': {
    app: zh,
  },
} satisfies Record<
  (typeof langs)[number],
  Record<(typeof ns)[number], Record<string, string>>
>

const i18n = i18next.createInstance()

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      default: ['en'],
    },
    defaultNS: 'app',
    resources,
    keySeparator: false,
    nsSeparator: false,
  })

export { i18n }
export const getI18n = () => i18n
