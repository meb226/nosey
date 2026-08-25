import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Server-side only. This module must never be imported from a client
 * component — the key has to stay out of the client bundle.
 *
 * Constructed on first use rather than at import, so `next build` doesn't
 * need the key to load a route module.
 */
let cached: Anthropic | null = null

export function anthropic(): Anthropic {
  if (!cached) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. See .env.local.example.')
    }
    cached = new Anthropic()
  }
  return cached
}

/** Chosen on explanation quality, per MIK-33. Not a cost decision. */
export const MODEL = 'claude-sonnet-5'
