'use client'

import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Link } from '@/i18n/navigation'
import { APP_URL } from '@/lib/app-url'

export function Header({
  mode = 'default',
}: {
  mode?: 'default' | 'content' | 'home'
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const t = useTranslations('Header')
  const isContent = mode === 'content'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      data-site-header
      className={`${mode === 'home' ? 'sticky mx-auto mt-3' : 'fixed left-1/2 -translate-x-1/2'} top-3 z-50 w-[94%] max-w-5xl rounded-full transition-all duration-300 ${isContent ? 'dark' : ''} ${isScrolled ? isContent ? 'border border-white/10 bg-zinc-950/85 backdrop-blur-md' : 'border border-black/5 bg-white/85 backdrop-blur-md' : 'bg-transparent'}`}
      style={{
        boxShadow: isScrolled ? 'rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-2 py-2 pl-5 transition-all duration-300">
        <Link href="/" data-home-link className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Locusify"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-lg font-medium tracking-tight text-foreground">
            Locusify
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          <Link
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.features')}
          </Link>
          <Link
            href="#technology"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.technology')}
          </Link>
          <Link
            href="#gallery"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.gallery')}
          </Link>
          <Link
            href="#scenarios"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.scenarios')}
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.pricing')}
          </Link>
          <Link
            href="/blog"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('nav.blog')}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher isScrolled={isScrolled || isContent || mode === 'home'} />
          <Link
            href={APP_URL}
            className="whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            {t('action.cta')}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          className="inline-flex size-11 items-center justify-center text-foreground transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="max-h-[calc(100svh-88px)] overflow-y-auto rounded-b-2xl border-t border-border bg-background px-6 py-8 lg:hidden">
          <nav className="flex flex-col gap-6">
            <Link
              href="#features"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('nav.features')}
            </Link>
            <Link
              href="#technology"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('nav.technology')}
            </Link>
            <Link
              href="#gallery"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('nav.gallery')}
            </Link>
            <Link
              href="#scenarios"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('nav.scenarios')}
            </Link>
            <Link
              href="#pricing"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('nav.pricing')}
            </Link>
            <Link
              href="/blog"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('nav.blog')}
            </Link>
            <div className="mt-2">
              <LanguageSwitcher variant="mobile" />
            </div>
            <Link
              href={APP_URL}
              className="mt-2 bg-foreground px-5 py-3 text-center text-sm font-medium text-background rounded-full"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('action.cta')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
