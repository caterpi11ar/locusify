interface ReleaseManifest {
  versions: string[]
  languages: string[]
  latest: string
}

const FALLBACK_MANIFEST: ReleaseManifest = {
  versions: [],
  languages: ['en', 'zh-CN'],
  latest: '',
}

let manifestCache: Promise<ReleaseManifest> | null = null

async function loadManifest(): Promise<ReleaseManifest> {
  if (!manifestCache) {
    manifestCache = fetch(`${import.meta.env.BASE_URL}releases/index.json`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ReleaseManifest>
      })
      .catch(() => FALLBACK_MANIFEST)
  }
  return manifestCache
}

async function tryFetchReleaseNote(version: string, lang: string): Promise<string | null> {
  const url = `${import.meta.env.BASE_URL}releases/v${version}/${lang}.md`
  const res = await fetch(url)
  if (!res.ok)
    return null
  return res.text()
}

export async function fetchReleaseNotes(version: string, preferredLang: string): Promise<string> {
  const manifest = await loadManifest()
  const normalizedLang = preferredLang === 'zh-CN' ? 'zh-CN' : 'en'
  const langChain = normalizedLang === 'en' ? ['en'] : [normalizedLang, 'en']

  if (manifest.languages.includes(normalizedLang) === false && normalizedLang !== 'en')
    langChain.unshift('en')

  for (const lang of langChain) {
    const content = await tryFetchReleaseNote(version, lang)
    if (content)
      return content
  }

  throw new Error(`Release notes not found for v${version}`)
}
