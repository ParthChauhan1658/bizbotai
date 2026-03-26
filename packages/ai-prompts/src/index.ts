export { buildBasePrompt } from './templates/base'
export { buildRestaurantPrompt } from './templates/restaurant'
export { buildClinicPrompt } from './templates/clinic'
export { buildSalonPrompt } from './templates/salon'
export type { PromptContext } from './templates/base'

import { buildBasePrompt } from './templates/base'
import { buildRestaurantPrompt } from './templates/restaurant'
import { buildClinicPrompt } from './templates/clinic'
import { buildSalonPrompt } from './templates/salon'
import type { PromptContext } from './templates/base'

export function getSystemPrompt(businessType: string, ctx: PromptContext): string {
  switch (businessType) {
    case 'restaurant': return buildRestaurantPrompt(ctx)
    case 'clinic': return buildClinicPrompt(ctx)
    case 'salon': return buildSalonPrompt(ctx)
    default: return buildBasePrompt(ctx)
  }
}
