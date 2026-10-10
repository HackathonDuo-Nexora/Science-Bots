/**
 * researchProvider.js
 *
 * Provider selector for the Researcher agent.
 *
 * Reads configuration from environment:
 *   RESEARCH_MODE:
 *     demo  — use demoResearchProvider (deterministic demo data)
 *     real  — use realResearchProvider (OpenAlex scholarly search)
 *   RESEARCH_FALLBACK_TO_DEMO:
 *     true (default) — fall back to demo if real search encounters errors
 *     false          — return empty/no fallback on real search error
 *
 * Interface exported:
 *   search({ topic, existingSources, pass }) → Promise<{ sources: [], claims: [], usedFallback?: boolean }>
 *   getResearchMode() → 'demo' | 'real'
 *   shouldFallbackToDemo() → boolean
 *
 * The engine always calls this module — never a specific provider directly.
 */

import { search as demoSearch } from './demoResearchProvider.js';
import { search as realSearch } from './realResearchProvider.js';

/**
 * Get current configured research mode.
 * Evaluated per-call so runtime or environment updates take effect immediately.
 * @returns {'demo' | 'real' | string}
 */
export function getResearchMode() {
  return (process.env.RESEARCH_MODE ?? 'demo').trim().toLowerCase();
}

/**
 * Determine if fallback to demo provider is enabled when real search fails.
 * Defaults to true for resilience.
 * @returns {boolean}
 */
export function shouldFallbackToDemo() {
  const val = process.env.RESEARCH_FALLBACK_TO_DEMO;
  if (val === undefined || val === null || val === '') return true;
  return val.trim().toLowerCase() !== 'false';
}

console.log(`[ResearchProvider] Initialized. Default Mode: ${getResearchMode()}, Fallback: ${shouldFallbackToDemo()}`);

/**
 * Perform a research search using the configured provider.
 *
 * Safely handles errors and falls back to demo provider if configured,
 * ensuring the Express server never crashes.
 *
 * @param {object}   opts
 * @param {string}   opts.topic           - Research topic
 * @param {object[]} opts.existingSources - Already-collected sources (for dedup)
 * @param {string}   opts.pass            - 'initial' | 'supplementary'
 * @returns {Promise<{ sources: object[], claims: object[], usedFallback?: boolean }>}
 */
export async function search(opts) {
  const mode = getResearchMode();

  if (mode === 'demo') {
    const result = await demoSearch(opts);
    return { ...result, usedFallback: false, mode: 'demo' };
  }

  if (mode === 'real') {
    try {
      const result = await realSearch(opts);
      return { ...result, usedFallback: false, mode: 'real' };
    } catch (err) {
      console.warn(`[ResearchProvider] Real search provider failed: ${err.message}`);

      if (shouldFallbackToDemo()) {
        console.warn('[ResearchProvider] RESEARCH_FALLBACK_TO_DEMO=true — falling back safely to demo provider.');
        try {
          const fallback = await demoSearch(opts);
          return {
            ...fallback,
            usedFallback: true,
            mode: 'demo',
            fallbackReason: err.message,
          };
        } catch (fallbackErr) {
          console.error(`[ResearchProvider] Fallback provider also failed: ${fallbackErr.message}`);
          return {
            sources: [],
            claims: [],
            usedFallback: true,
            mode: 'demo',
            error: fallbackErr.message,
          };
        }
      }

      console.warn('[ResearchProvider] RESEARCH_FALLBACK_TO_DEMO=false — returning empty results.');
      return {
        sources: [],
        claims: [],
        usedFallback: false,
        mode: 'real',
        error: err.message,
      };
    }
  }

  // Unrecognised mode — warn and use demo
  console.warn(`[ResearchProvider] Unknown RESEARCH_MODE "${mode}" — defaulting to demo.`);
  const fallback = await demoSearch(opts);
  return { ...fallback, usedFallback: false, mode: 'demo' };
}
