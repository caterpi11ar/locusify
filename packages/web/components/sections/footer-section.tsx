'use client'

import { useTranslations } from 'next-intl'
import NextLink from 'next/link'
import { Link } from '@/i18n/navigation'

export function FooterSection({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const t = useTranslations('Footer')
  const isDark = variant === 'dark'

  const footerLinks = {
    product: [
      { label: t('links.features'), href: '#features' },
      { label: t('links.privacy'), href: '#technology' },
      { label: t('links.faq'), href: '#faq' },
      { label: t('links.blog'), href: '/blog' },
    ],
    social: [
      { label: 'GitHub', href: 'https://github.com/caterpi11ar' },
    ],
  }

  return (
    <footer className={isDark ? 'bg-zinc-950' : 'bg-background'}>
      <div className={`border-t px-6 py-20 text-center md:px-12 md:py-28 lg:px-20 ${isDark ? 'border-zinc-800' : 'border-border'}`}>
        <p className={`text-2xl font-medium tracking-tight md:text-3xl lg:text-4xl ${isDark ? 'text-zinc-100' : 'text-foreground'}`}>
          {t('cta.title')}
        </p>
        <div className="mt-8">
          <NextLink
            href="https://app.locusify.cn"
            className={`inline-block rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-80 ${isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-foreground text-background'}`}
          >
            {t('cta.button')}
          </NextLink>
        </div>
      </div>

      <div className={`border-t px-6 py-16 md:px-12 md:py-20 lg:px-20 ${isDark ? 'border-zinc-800' : 'border-border'}`}>
        <div className="grid grid-cols-2 gap-12 md:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <Link href="/" className={`text-lg font-medium ${isDark ? 'text-zinc-100' : 'text-foreground'}`}>
              Locusify
            </Link>
            <p className={`mt-4 max-w-xs text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-muted-foreground'}`}>
              {t('brand.description')}
            </p>
          </div>

          <div>
            <h4 className={`mb-4 text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-foreground'}`}>{t('links.product')}</h4>
            <ul className="space-y-3">
              {footerLinks.product.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`text-sm transition-colors ${isDark ? 'text-zinc-400 hover:text-zinc-100' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`mb-4 text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-foreground'}`}>{t('links.social')}</h4>
            <ul className="space-y-3">
              {footerLinks.social.map(link => (
                <li key={link.label}>
                  <NextLink
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm transition-colors ${isDark ? 'text-zinc-400 hover:text-zinc-100' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {link.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={`border-t px-6 py-6 md:px-12 lg:px-20 ${isDark ? 'border-zinc-800' : 'border-border'}`}>
        <p className={`text-center text-xs ${isDark ? 'text-zinc-500' : 'text-muted-foreground'}`}>
          {t('legal.copyright')}
        </p>
      </div>
    </footer>
  )
}
