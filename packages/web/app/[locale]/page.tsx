import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { JsonLd } from '@/components/json-ld'
import { CollectionSection } from '@/components/sections/collection-section'
import { EditorialSection } from '@/components/sections/editorial-section'
import { FAQSection } from '@/components/sections/faq-section'
import { FeaturedGuidesSection } from '@/components/sections/featured-guides-section'
import { FeaturedProductsSection } from '@/components/sections/featured-products-section'
import { FooterSection } from '@/components/sections/footer-section'
import { GallerySection } from '@/components/sections/gallery-section'
import { HeroSection } from '@/components/sections/hero-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { PhilosophySection } from '@/components/sections/philosophy-section'
import { PricingSection } from '@/components/sections/pricing-section'
import { TechnologySection } from '@/components/sections/technology-section'
import { TestimonialsSection } from '@/components/sections/testimonials-section'
import { SiteHeader } from '@/components/site-header'
import { SITE_URL } from '@/lib/site'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  const title = t('site.title')
  const description = t('site.description')
  const canonicalUrl = locale === 'zh' ? SITE_URL : `${SITE_URL}/en`

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    icons: {
      icon: [
        { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      ],
      apple: '/apple-icon.png',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'zh': SITE_URL,
        'en': `${SITE_URL}/en`,
        'x-default': SITE_URL,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Locusify',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? 'en_US' : 'zh_CN',
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    verification: {
      google: 'by9hGLiRBrIQCeNmcjRon0Q3q8uJP7mxau9oh1seY3w',
    },
  }
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'FAQ' })
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': Array.from({ length: 6 }, (_, index) => ({
      '@type': 'Question',
      'name': t(`q${index + 1}.question`),
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': t(`q${index + 1}.answer`),
      },
    })),
  }

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <JsonLd data={faqJsonLd} />
      <SiteHeader />
      <HeroSection />
      <PhilosophySection />
      <HowItWorksSection />
      <FeaturedProductsSection />
      <TechnologySection />
      <GallerySection />
      <CollectionSection />
      <PricingSection />
      <EditorialSection />
      <TestimonialsSection />
      <FeaturedGuidesSection locale={locale} />
      <FAQSection />
      <FooterSection />
    </main>
  )
}
