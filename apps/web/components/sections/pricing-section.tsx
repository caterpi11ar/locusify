"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

export function PricingSection() {
  const t = useTranslations("Pricing");

  const tiers = [
    {
      name: t("free.name"),
      price: t("free.price"),
      period: t("free.period"),
      description: t("free.description"),
      cta: t("free.cta"),
      popular: false,
      features: [
        t("free.feature1"),
        t("free.feature2"),
        t("free.feature3"),
        t("free.feature4"),
        t("free.feature5"),
      ],
    },
    {
      name: t("pro.name"),
      price: t("pro.price"),
      period: t("pro.period"),
      description: t("pro.description"),
      cta: t("pro.cta"),
      popular: true,
      features: [
        t("pro.feature1"),
        t("pro.feature2"),
        t("pro.feature3"),
        t("pro.feature4"),
        t("pro.feature5"),
        t("pro.feature6"),
        t("pro.feature7"),
      ],
    },
    {
      name: t("flagship.name"),
      price: t("flagship.price"),
      period: t("flagship.period"),
      description: t("flagship.description"),
      cta: t("flagship.cta"),
      popular: false,
      features: [
        t("flagship.feature1"),
        t("flagship.feature2"),
        t("flagship.feature3"),
        t("flagship.feature4"),
        t("flagship.feature5"),
        t("flagship.feature6"),
        t("flagship.feature7"),
      ],
    },
  ];

  return (
    <section id="pricing" className="bg-background px-6 py-20 md:px-12 md:py-28 lg:px-20 lg:py-36">
      <div className="mb-16 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("heading.subtitle")}
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl">
          {t("heading.title")}
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("heading.startFree")}
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={
              tier.popular
                ? "bg-foreground p-8 md:p-10 flex flex-col"
                : "bg-background p-8 md:p-10 flex flex-col"
            }
          >
            <div className="mb-4 h-6">
              {tier.popular && (
                <span className="inline-block rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground">
                  {t("heading.popular")}
                </span>
              )}
            </div>

            <h3
              className={
                tier.popular
                  ? "text-lg font-medium text-background"
                  : "text-lg font-medium text-foreground"
              }
            >
              {tier.name}
            </h3>

            <div className="mt-4 flex items-baseline">
              <span
                className={
                  tier.popular
                    ? "text-4xl font-medium tracking-tight text-background"
                    : "text-4xl font-medium tracking-tight text-foreground"
                }
              >
                {tier.price}
              </span>
              {tier.period && (
                <span
                  className={
                    tier.popular
                      ? "ml-1 text-sm text-background/60"
                      : "ml-1 text-sm text-muted-foreground"
                  }
                >
                  {tier.period}
                </span>
              )}
            </div>

            <p
              className={
                tier.popular
                  ? "mt-3 text-sm text-background/60"
                  : "mt-3 text-sm text-muted-foreground"
              }
            >
              {tier.description}
            </p>

            <a
              href="https://app.locusify.cn"
              target="_blank"
              rel="noopener noreferrer"
              className={
                tier.popular
                  ? "mt-8 inline-block rounded-full bg-background px-8 py-3.5 text-center text-sm font-medium text-foreground transition-opacity hover:opacity-90"
                  : "mt-8 inline-block rounded-full border border-border px-8 py-3.5 text-center text-sm font-medium text-foreground transition-opacity hover:opacity-70"
              }
            >
              {tier.cta}
            </a>

            <ul className="mt-8 flex-1 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check
                    className={
                      tier.popular
                        ? "mt-0.5 h-4 w-4 shrink-0 text-background/40"
                        : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50"
                    }
                  />
                  <span
                    className={
                      tier.popular
                        ? "text-sm text-background/80"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
