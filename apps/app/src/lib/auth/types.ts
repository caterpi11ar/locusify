export type AuthProviderType = 'google' | 'github' | 'email'

export interface AuthUser {
  id: string
  name: string
  avatarUrl: string
  email?: string
  provider: AuthProviderType
}

export interface AuthProvider {
  type: AuthProviderType
  name: string
  login: () => Promise<void>
}
