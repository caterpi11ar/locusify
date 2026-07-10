import type { ReplayTemplateConfig } from '@/types/template'
import { templates } from '@/data/templates'

export const BASE_SEGMENT_DURATION = 2000
export const DWELL_DURATION = 400
export const DEFAULT_TEMPLATE_ID = 'minimal'

export function getDefaultTemplateConfig(): ReplayTemplateConfig {
  return templates.find(t => t.id === DEFAULT_TEMPLATE_ID)!.config
}
