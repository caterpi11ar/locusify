export function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-950">
      <div className="locusify-splash flex flex-col items-center gap-5">
        <img
          src="/logo.png"
          alt="Locusify"
          width="96"
          height="96"
          className="locusify-splash-logo size-20 rounded-2xl sm:size-24"
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Locusify
          </span>
          <span className="text-sm text-white/40 sm:text-base">
            Your Journey, Mapped
          </span>
        </div>
      </div>
    </div>
  )
}
