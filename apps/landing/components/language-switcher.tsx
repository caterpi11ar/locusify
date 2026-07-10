"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher({
  variant = "default",
  isScrolled = false,
}: {
  variant?: "default" | "mobile";
  isScrolled?: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (nextLocale: "zh" | "en") => {
    if (nextLocale === locale) return;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(pathname + hash, { locale: nextLocale });
  };

  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => switchTo("zh")}
          className={`text-sm transition-colors ${locale === "zh" ? "text-foreground font-medium" : "text-muted-foreground"}`}
        >
          中文
        </button>
        <span className="text-muted-foreground/30">|</span>
        <button
          type="button"
          onClick={() => switchTo("en")}
          className={`text-sm transition-colors ${locale === "en" ? "text-foreground font-medium" : "text-muted-foreground"}`}
        >
          EN
        </button>
      </div>
    );
  }

  const activeCls = isScrolled
    ? "bg-foreground/10 text-foreground"
    : "bg-white/20 text-white";

  const inactiveCls = isScrolled
    ? "text-muted-foreground hover:text-foreground"
    : "text-white/50 hover:text-white/70";

  const borderCls = isScrolled
    ? "border-border/40 hover:border-border/60"
    : "border-white/20 hover:border-white/30";

  return (
    <div className={`flex items-center rounded-full border p-0.5 transition-colors duration-300 ${borderCls}`}>
      <button
        type="button"
        onClick={() => switchTo("zh")}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${locale === "zh" ? activeCls : inactiveCls}`}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${locale === "en" ? activeCls : inactiveCls}`}
      >
        EN
      </button>
    </div>
  );
}
