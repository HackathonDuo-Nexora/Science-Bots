/**
 * demoResearchProvider.js
 *
 * Deterministic demo implementation of the research provider interface.
 *
 * Returns clearly-marked demo sources — never real academic content.
 * Used when RESEARCH_MODE=demo (default) or as fallback when the real
 * provider fails.
 *
 * Interface:
 *   search({ topic, existingSources, pass }) → { sources: [] }
 *
 * Passes:
 *   'initial'       — first researcher pass, returns 3 seeded demo sources
 *   'supplementary' — second researcher pass, returns 1 additional source
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID().replace(/-/g, '');
}

function shortTopic(topic) {
  return topic.length > 45 ? `${topic.substring(0, 45)}…` : topic;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Demo research provider.
 *
 * @param {object} opts
 * @param {string}   opts.topic            - Research topic
 * @param {object[]} opts.existingSources  - Sources already collected (for dedup)
 * @param {string}   opts.pass             - 'initial' | 'supplementary'
 * @returns {Promise<{ sources: object[] }>}
 */
export async function search({ topic, existingSources = [], pass = 'initial' }) {
  const t = shortTopic(topic);

  if (pass === 'initial') {
    return {
      sources: [
        {
          id:         `src_${uid()}`,
          title:      `[DEMO] Systematic Review: ${t}`,
          authors:    ['Demo, A.', 'Research, B.'],
          year:       2024,
          url:        'https://demo.example.com/source-1',
          sourceType: 'journal',
          relevance:  'high',
          demo:       true,
        },
        {
          id:         `src_${uid()}`,
          title:      `[DEMO] Empirical Study on Emerging Trends in ${t}`,
          authors:    ['Demo, C.', 'Study, D.'],
          year:       2023,
          url:        'https://demo.example.com/source-2',
          sourceType: 'conference',
          relevance:  'high',
          demo:       true,
        },
        {
          id:         `src_${uid()}`,
          title:      `[DEMO] Technical Analysis and Future Directions: ${t}`,
          authors:    ['Demo, E.'],
          year:       2024,
          url:        'https://demo.example.com/source-3',
          sourceType: 'preprint',
          relevance:  'medium',
          demo:       true,
        },
      ],
    };
  }

  if (pass === 'supplementary') {
    return {
      sources: [
        {
          id:         `src_${uid()}`,
          title:      `[DEMO] Supplementary Evidence: Key Claims in ${t}`,
          authors:    ['Demo, F.', 'Evidence, G.'],
          year:       2025,
          url:        'https://demo.example.com/source-4',
          sourceType: 'journal',
          relevance:  'high',
          demo:       true,
        },
      ],
    };
  }

  // Unknown pass — return empty safely
  console.warn(`[DemoResearchProvider] Unknown pass "${pass}" — returning no sources.`);
  return { sources: [] };
}
