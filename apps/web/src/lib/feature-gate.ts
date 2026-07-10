import type { Plan } from '@/stores/subscriptionStore'

export type Feature = 'premium_templates'

const PAID_PLANS: Plan[] = ['pro', 'max']
const PAID_FEATURES: Feature[] = ['premium_templates']

export function canUse(feature: Feature, plan: Plan): boolean {
  if (PAID_FEATURES.includes(feature))
    return PAID_PLANS.includes(plan)
  return true
}

export function isPro(plan: Plan): boolean {
  return PAID_PLANS.includes(plan)
}
