import en from '@/messages/en.json'
import zh from '@/messages/zh.json'

export function NotFoundContent({ locale = 'zh' }: { locale?: string }) {
  const t = (locale === 'en' ? en : zh).NotFound
  const home = locale === 'en' ? '/en' : '/'
  return (
    <div className="flex min-h-svh flex-col bg-[#f7f7f4] px-6 py-8 text-[#24241f] md:py-16">
      <title>{`${t.title} · Locusify`}</title>
      <a href={home} className="self-start rounded font-medium focus-visible:outline-2 focus-visible:outline-offset-4">Locusify</a>
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center py-8 text-center">
        <p className="text-sm tracking-widest">404</p>
        <h1 className="mt-4 text-[32px] font-medium leading-[1.2] md:text-[40px]">{t.title}</h1>
        <p className="mt-4 text-base leading-6">{t.description}</p>
        <a href={home} className="mt-8 inline-flex min-h-12 w-full max-w-80 items-center justify-center rounded-full bg-[#24241f] px-6 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#24241f] sm:w-auto">{t.home}</a>
      </main>
    </div>
  )
}
