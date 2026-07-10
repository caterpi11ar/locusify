const STORAGE_KEY = 'locusify-tokens'

interface Tokens {
  accessToken: string
  refreshToken: string
}

export async function getTokens(): Promise<{ accessToken: string | null, refreshToken: string | null }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return { accessToken: null, refreshToken: null }
    const parsed: Tokens = JSON.parse(raw)
    return { accessToken: parsed.accessToken ?? null, refreshToken: parsed.refreshToken ?? null }
  }
  catch {
    return { accessToken: null, refreshToken: null }
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }))
}

export async function clearTokens(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY)
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens()
  return tokens.accessToken
}
