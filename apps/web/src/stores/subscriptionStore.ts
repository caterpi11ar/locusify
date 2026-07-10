import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import { env } from '@/lib/env'

export type Plan = 'free' | 'pro' | 'max'

interface Subscription {
  plan: Plan
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

interface SubscriptionState {
  subscription: Subscription
  loading: boolean
  isPro: boolean
  fetchSubscription: () => Promise<void>
  clear: () => void
}

const defaultSubscription: Subscription = {
  plan: 'free',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

interface SubscriptionResponse {
  plan: Plan
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

const PAID_PLANS: Plan[] = ['pro', 'max']

export const useSubscriptionStore = create<SubscriptionState>(set => ({
  subscription: defaultSubscription,
  loading: false,
  isPro: env.VITE_DEBUG_PRO,

  fetchSubscription: async () => {
    set({ loading: true })
    try {
      const data = await apiClient.get<SubscriptionResponse>('/subscriptions')

      const subscription: Subscription = {
        plan: data.plan,
        status: data.status,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
      }

      set({
        subscription,
        isPro: env.VITE_DEBUG_PRO || (PAID_PLANS.includes(data.plan)
          && data.status === 'active'
          && (!data.current_period_end || new Date(data.current_period_end) > new Date())),
        loading: false,
      })
    }
    catch {
      set({ subscription: defaultSubscription, isPro: env.VITE_DEBUG_PRO, loading: false })
    }
  },

  clear: () => set({ subscription: defaultSubscription, isPro: env.VITE_DEBUG_PRO, loading: false }),
}))
