/**
 * productionReliability.test.js
 *
 * Dedicated test suite verifying production reliability enhancements:
 * 1. OpenAlex HTTP 429 retry handling with Retry-After header.
 * 2. Crossref fallback when OpenAlex is rate-limited or unavailable.
 * 3. Gemini model cascade when primary model encounters 429 quota exhaustion.
 * 4. Strict real-mode error reporting (no demo data injection when fallback is false).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchOpenAlexWithRetry,
  search as realSearch,
} from '../src/services/research/realResearchProvider.js';
import { analyzeClaims } from '../src/services/analyzerService.js';
import { search as providerSearch } from '../src/services/research/researchProvider.js';

describe('Production Reliability: Source Retrieval & 429 Recovery', () => {
  const originalFetch = globalThis.fetch;

  test('fetchOpenAlexWithRetry retries upon receiving HTTP 429 with Retry-After header', async () => {
    let callCount = 0;

    globalThis.fetch = async (url, options) => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'Retry-After': '1',
            'Content-Type': 'application/json',
          },
        });
      }
      return new Response(
        JSON.stringify({
          results: [
            {
              id: 'https://openalex.org/W12345',
              title: 'Retry Recovered Scholarly Work',
              doi: 'https://doi.org/10.1000/recovered',
              publication_year: 2024,
              abstract_inverted_index: {
                Empirical: [0],
                evidence: [1],
                is: [2],
                verified: [3],
              },
            },
          ],
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    try {
      const res = await fetchOpenAlexWithRetry(
        'https://api.openalex.org/works?search=test',
        {},
        2
      );
      assert.equal(res.status, 200);
      assert.equal(callCount, 2, 'Should have retried after initial 429');
      const data = await res.json();
      assert.equal(data.results[0].title, 'Retry Recovered Scholarly Work');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('realResearchProvider falls back to Crossref when OpenAlex encounters HTTP 429 or failure', async () => {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes('api.openalex.org')) {
        // OpenAlex consistently fails with 429
        return new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          statusText: 'Too Many Requests',
        });
      }

      if (urlStr.includes('api.crossref.org')) {
        // Crossref responds with authentic scholarly works
        return new Response(
          JSON.stringify({
            message: {
              items: [
                {
                  DOI: '10.1145/3318464.3389700',
                  title: ['Distributed Consensus in Scalable Network Architectures'],
                  URL: 'https://doi.org/10.1145/3318464.3389700',
                  container_title: ['ACM Transactions on Computer Systems'],
                  issued: { 'date-parts': [[2024]] },
                  abstract: '<jats:p>Distributed consensus algorithms evaluate Byzantine fault-tolerance across scalable peer networks.</jats:p>',
                },
              ],
            },
          }),
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return originalFetch(url, options);
    };

    try {
      const result = await realSearch({
        topic: 'Distributed Consensus Algorithms',
        existingSources: [],
        pass: 'initial',
      });

      assert.ok(result.sources.length > 0, 'Should have retrieved sources via Crossref');
      assert.equal(result.sources[0].title, 'Distributed Consensus in Scalable Network Architectures');
      assert.equal(result.sources[0].demo, false, 'Sources must be marked demo=false');
      assert.ok(result.sources[0].url.includes('doi.org'));
      assert.ok(result.claims.length > 0, 'Should have extracted initial claims');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Strict failure reporting: when both real providers fail and fallback=false, no demo sources are injected', async () => {
    const origMode = process.env.RESEARCH_MODE;
    const origFallback = process.env.RESEARCH_FALLBACK_TO_DEMO;
    process.env.RESEARCH_MODE = 'real';
    process.env.RESEARCH_FALLBACK_TO_DEMO = 'false';

    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes('api.openalex.org') || urlStr.includes('api.crossref.org')) {
        return new Response(JSON.stringify({ error: 'Service Unavailable' }), {
          status: 503,
          statusText: 'Service Unavailable',
        });
      }
      return originalFetch(url, options);
    };

    try {
      const result = await providerSearch({
        topic: 'Quantum Error Correction',
        pass: 'initial',
      });

      assert.equal(result.mode, 'real');
      assert.equal(result.usedFallback, false);
      assert.equal(result.sources.length, 0, 'Must not inject demo sources');
      assert.ok(result.error, 'Should report honest error message');
      assert.ok(!result.sources.some((s) => s.demo === true));
    } finally {
      globalThis.fetch = originalFetch;
      process.env.RESEARCH_MODE = origMode;
      process.env.RESEARCH_FALLBACK_TO_DEMO = origFallback;
    }
  });
});

describe('Production Reliability: Gemini Model Cascade', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;

  test('Gemini analyzer cascades to secondary model when primary model returns 429 quota exhaustion', async () => {
    process.env.GEMINI_API_KEY = 'test_mock_gemini_key_123';
    let attemptedModels = [];

    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if (urlStr.includes('generativelanguage.googleapis.com')) {
        const match = urlStr.match(/models\/([^:]+):generateContent/);
        const modelName = match ? match[1] : 'unknown';
        attemptedModels.push(modelName);

        if (attemptedModels.length === 1) {
          // First model hits 429 Resource Exhausted
          return new Response(
            JSON.stringify({
              error: {
                code: 429,
                message: 'Resource has been exhausted (e.g. check quota).',
                status: 'RESOURCE_EXHAUSTED',
              },
            }),
            {
              status: 429,
              statusText: 'Too Many Requests',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // Second cascaded model succeeds with valid JSON output
        const validAnalysis = [
          {
            claimId: 'clm_1',
            status: 'supported',
            confidence: 0.89,
            sourceIds: ['src_1'],
            summary: 'Primary evidence confirms claim validity.',
          },
        ];

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(validAnalysis) }],
                },
              },
            ],
          }),
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return originalFetch(url, options);
    };

    try {
      const results = await analyzeClaims({
        topic: 'Graph Neural Networks',
        claims: [{ id: 'clm_1', text: 'GNNs process non-Euclidean data.' }],
        sources: [
          {
            id: 'src_1',
            title: 'Graph Representation Learning',
            url: 'https://doi.org/10.1000/gnn',
            snippet: 'GNNs learn representations on graph-structured data.',
          },
        ],
      });

      assert.ok(attemptedModels.length >= 2, 'Should have cascaded to second model');
      assert.equal(results.length, 1);
      assert.equal(results[0].claimId, 'clm_1');
      assert.equal(results[0].status, 'supported');
      assert.equal(results[0].sourceIds[0], 'src_1');
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
    }
  });
});
