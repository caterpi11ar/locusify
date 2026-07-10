import type { AuthProvider } from '../types'
import { githubProvider } from './github'
import { googleProvider } from './google'

const providers: AuthProvider[] = [googleProvider, githubProvider]

export function getAuthProviders(): AuthProvider[] {
  return providers
}
