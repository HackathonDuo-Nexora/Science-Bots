/**
 * researchProvider.js
 *
 * Provider selector for the Researcher agent.
 *
 * Reads RESEARCH_MODE from environment:
 *   demo  — use demoResearchProvider (default, safe fallback)
 *   real  — use real research implementation (placeholder for Phase 4)
 *
 * Interface exported:
 *   search({ topic, existingSources, pass }) → { sources: [] }
 *
 * The engine always calls this function — never a specific provider directly.
 * Swap the implementation here when the real provider is ready.
 */

import { search as demoSearch } from './demoResearchProvider.js';

// ─── Real provider placeholder ────────────────────────────────────────────────
// Replace this with actual implementation in Phase 4.
// Should accept the same interface: { topic, existingSources, pass }
async function realSearch(opts) {
  // TODO (Phase 4): Implement real research using search APIs / n8n / AI tools.
  // For now, throw so the caller can fall back to demo mode gracefully.
  throw new Error('Real research provider is not yet implemented. Set RESEARCH_MODE=demo.');
}

// ─── Provider selector ────────────────────────────────────────────────────────

const RESEARCH_MODE = (process.env.RESEARCH_MODE ?? 'demo').trim().toLowerCase();

console.log(`[ResearchProvider] Mode: ${RESEARCH_MODE}`);

/**
 * Perform a research search using the configured provider.
 *
 * Falls back to demo provider automatically if:
 *   - RESEARCH_MODE=real but the real provider fails
 *   - RESEARCH_MODE is unrecognised
 *
 * @param {object}   opts
 * @param {string}   opts.topic           - Research topic
 * @param {object[]} opts.existingSources - Already-collected sources
 * @param {string}   opts.pass            - 'initial' | 'supplementary'
 * @returns {Promise<{ sources: object[], usedFallback?: boolean }>}
 */
export async function search(opts) {
  if (RESEARCH_MODE === 'demo') {
    return demoSearch(opts);
  }

  if (RESEARCH_MODE === 'real') {
    try {
      const result = await realSearch(opts);
      return result;
    } catch (err) {
      console.warn(`[ResearchProvider] Real provider failed: ${err.message}`);
      console.warn('[ResearchProvider] Falling back to demo provider.');
      const fallback = await demoSearch(opts);
      return { ...fallback, usedFallback: true };
    }
  }

  // Unrecognised mode — warn and use demo
  console.warn(`[ResearchProvider] Unknown RESEARCH_MODE "${RESEARCH_MODE}" — defaulting to demo.`);
  return demoSearch(opts);
}

/**
 * Returns the currently active research mode.
 * Useful for logging and event payloads.
 * @returns {'demo'|'real'|string}
 */
export function getResearchMode() {
  return RESEARCH_MODE;
}
