"use client";

import { FadeImage } from "@/components/fade-image";
import { LazyVideo } from "@/components/lazy-video";
import { useTranslations } from "next-intl";

export function FeaturedProductsSection() {
  const t = useTranslations("FeaturedProducts");

  const features = [
    { title: t("feature1.title"), description: t("feature1.description"), detail: t("feature1.detail"), image: "/images/001.png" },
    { title: t("feature2.title"), description: t("feature2.description"), detail: t("feature2.detail"), image: "/images/travel-feature-3.jpg" },
    { title: t("feature3.title"), description: t("feature3.description"), detail: t("feature3.detail"), video: "/videos/002.webm" },
    { title: t("feature4.title"), description: t("feature4.description"), detail: t("feature4.detail"), image: "/images/travel-feature-5.jpg" },
    { title: t("feature5.title"), description: t("feature5.description"), detail: t("feature5.detail"), image: "/images/004.png" },
    { title: t("feature6.title"), description: t("feature6.description"), detail: t("feature6.detail"), image: "/images/travel-feature-6.jpg" },
  ];

  return (
    <section className="bg-background">
      <div className="px-6 py-20 text-center md:px-12 md:py-28 lg:px-20 lg:py-32 lg:pb-20">
        <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl">
          {t("heading.title1")}
          <br />
          {t("heading.title2")}
        </h2>
        <p className="mx-auto mt-6 max-w-md text-sm text-muted-foreground">
          {t("heading.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 pb-20 md:grid-cols-3 md:px-12 lg:px-20">
        {features.map((feature) => (
          <div key={feature.title} className="group">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              {"video" in feature && feature.video ? (
                <LazyVideo
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={feature.video}
                />
              ) : (
                <FadeImage
                  src={feature.image || "/placeholder.svg"}
                  alt={feature.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105"
                />
              )}
            </div>

            <div className="py-6">
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                {feature.description}
              </p>
              <h3 className="text-foreground text-xl font-semibold">
                {feature.title}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center px-6 pb-28 md:px-12 lg:px-20">

      </div>
    </section>
  );
}
