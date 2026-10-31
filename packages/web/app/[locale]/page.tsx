import { getTranslations, setRequestLocale } from 'next-intl/server'
import { JsonLd } from '@/components/json-ld'
import { FAQSection } from '@/components/sections/faq-section'
import { FooterSection } from '@/components/sections/footer-section'
import { HeroSection } from '@/components/sections/hero-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { PricingSection } from '@/components/sections/pricing-section'
import { PrivacySummarySection } from '@/components/sections/privacy-summary-section'
import { ResultsSection } from '@/components/sections/results-section'
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
    <main className="min-h-screen bg-background overflow-x-clip">
      <JsonLd data={faqJsonLd} />
      <SiteHeader />
      <HeroSection />
      <HowItWorksSection />
      <ResultsSection />
      <PrivacySummarySection />
      <PricingSection />
      <FAQSection />
      <FooterSection />
    </main>
  )
}
