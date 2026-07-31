import { getTranslations, setRequestLocale } from 'next-intl/server'
import { JsonLd } from '@/components/json-ld'
import { CollectionSection } from '@/components/sections/collection-section'
import { EditorialSection } from '@/components/sections/editorial-section'
import { FAQSection } from '@/components/sections/faq-section'
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
      <FAQSection />
      <FooterSection />
    </main>
  )
}
