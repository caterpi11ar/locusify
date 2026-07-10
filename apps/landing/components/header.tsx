"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";

export function Header({ mode = "home" }: { mode?: "home" | "content" }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const t = useTranslations("Header");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-4xl transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-md rounded-full" : "bg-transparent"}`}
      style={{
        boxShadow: isScrolled ? "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px" : "none"
      }}
    >
      <div className="flex items-center justify-between transition-all duration-300 px-2 pl-5 py-2">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Locusify"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className={`text-lg font-medium tracking-tight transition-colors duration-300 ${isScrolled ? "text-foreground" : "text-white"}`}>
            Locusify
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="#features"
            className={`text-sm transition-colors ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
          >
            {t("nav.features")}
          </Link>
          <Link
            href="#technology"
            className={`text-sm transition-colors ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
          >
            {t("nav.technology")}
          </Link>
          <Link
            href="#gallery"
            className={`text-sm transition-colors ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
          >
            {t("nav.gallery")}
          </Link>
          <Link
            href="#scenarios"
            className={`text-sm transition-colors ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
          >
            {t("nav.scenarios")}
          </Link>
          <Link
            href="#pricing"
            className={`text-sm transition-colors ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href="/blog"
            className={`text-sm transition-colors ${isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white"}`}
          >
            {t("nav.blog")}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher isScrolled={isScrolled} />
          <Link
            href="https://app.locusify.cn"
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-all rounded-full ${isScrolled ? "bg-foreground text-background hover:opacity-80" : "bg-white text-foreground hover:bg-white/90"}`}
          >
            {t("action.cta")}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`transition-colors md:hidden ${isScrolled ? "text-foreground" : "text-white"}`}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-border bg-background px-6 py-8 md:hidden rounded-b-2xl">
          <nav className="flex flex-col gap-6">
            <Link
              href="#features"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.features")}
            </Link>
            <Link
              href="#technology"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.technology")}
            </Link>
            <Link
              href="#gallery"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.gallery")}
            </Link>
            <Link
              href="#scenarios"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.scenarios")}
            </Link>
            <Link
              href="#pricing"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/blog"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.blog")}
            </Link>
            <div className="mt-2">
              <LanguageSwitcher variant="mobile" />
            </div>
            <Link
              href="https://app.locusify.cn"
              className="mt-2 bg-foreground px-5 py-3 text-center text-sm font-medium text-background rounded-full"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("action.cta")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
