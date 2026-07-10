import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="mt-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist. Start mapping your travel photos instead.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="inline-block rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          Go Home
        </Link>
        <a
          href="https://app.locusify.cn"
          className="inline-block rounded-full border border-border px-8 py-3.5 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
        >
          Try Locusify Free
        </a>
      </div>
    </div>
  );
}
