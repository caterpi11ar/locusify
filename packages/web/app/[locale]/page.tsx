import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/site-header'
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

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
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
