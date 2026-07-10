import { apiClient } from './client'

export interface AuthMeResponse {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
}

export function fetchAuthMe() {
  return apiClient.get<AuthMeResponse>('/auth/me')
}

export interface OtpVerifyResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: { id: string, email: string }
}

export function sendOtp(email: string) {
  return apiClient.post<{ message: string }>('/auth/otp', { email })
}

export function verifyOtp(email: string, token: string) {
  return apiClient.post<OtpVerifyResponse>('/auth/otp/verify', { email, token })
}

interface SignupResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  message?: string
  user: { id: string, email: string }
}

export function signup(email: string, password: string) {
  return apiClient.post<SignupResponse>('/auth/signup', { email, password })
}

export function signin(email: string, password: string) {
  return apiClient.post<OtpVerifyResponse>('/auth/signin', { email, password })
}

export function forgotPassword(email: string, redirectUrl: string) {
  return apiClient.post<{ message: string }>('/auth/forgot-password', {
    email,
    redirect_url: redirectUrl,
  })
}

export function resetPassword(tokenHash: string, newPassword: string) {
  return apiClient.post<{ message: string }>('/auth/reset-password', {
    token_hash: tokenHash,
    new_password: newPassword,
  })
}
