'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-6 text-left"
      >
        <span className="pr-4 text-base font-medium text-foreground md:text-lg">
          {question}
        </span>
        <span className="flex-shrink-0 text-muted-foreground text-xl leading-none">
          {isOpen ? '\u2212' : '+'}
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-6 text-sm leading-relaxed text-muted-foreground md:text-base">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const t = useTranslations('FAQ')

  const faqs = [
    { question: t('q1.question'), answer: t('q1.answer') },
    { question: t('q2.question'), answer: t('q2.answer') },
    { question: t('q3.question'), answer: t('q3.answer') },
    { question: t('q4.question'), answer: t('q4.answer') },
    { question: t('q5.question'), answer: t('q5.answer') },
    { question: t('q6.question'), answer: t('q6.answer') },
  ]

  return (
    <section id="faq" className="bg-background px-6 py-20 md:px-12 md:py-28 lg:px-20 lg:py-36">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('heading.subtitle')}
          </p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl">
            {t('heading.title')}
          </h2>
        </div>
        <div className="border-t border-border">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  )
}
