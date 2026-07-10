import type { Plan } from '@/stores/subscriptionStore'
import { apiClient } from './client'

export interface RedemptionResult {
  id: string
  code_id: string
  user_id: string
  plan: Plan
  duration_days: number
  redeemed_at: string
}

export async function redeemCode(code: string): Promise<RedemptionResult> {
  return apiClient.post<RedemptionResult>('/redemptions/redeem', { code })
}
