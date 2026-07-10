import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/header";
import { BlogSection } from "@/components/sections/blog-section";
import { FooterSection } from "@/components/sections/footer-section";

const BASE_URL = "https://app.locusify.cn";

function getBlogUrl(locale: string) {
  return locale === "zh" ? `${BASE_URL}/blog` : `${BASE_URL}/en/blog`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog.meta" });
  const canonical = getBlogUrl(locale);

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        zh: `${BASE_URL}/blog`,
        en: `${BASE_URL}/en/blog`,
        "x-default": `${BASE_URL}/blog`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: canonical,
      type: "website",
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <Header mode="content" />
      <div className="pt-20 md:pt-24">
        <BlogSection locale={locale} />
      </div>
      <FooterSection variant="dark" />
    </main>
  );
}
