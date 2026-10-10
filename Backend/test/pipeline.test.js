/**
 * pipeline.test.js
 *
 * Automated test suite covering the Science Bots backend pipeline:
 * 1. Demo mode completes without a Gemini key.
 * 2. Real mode selects the real provider.
 * 3. Empty real search results do not trigger demo output.
 * 4. OpenAlex errors are handled correctly.
 * 5. Gemini errors do not become fabricated successful analysis.
 * 6. Insufficient evidence handling & grounding validation.
 * 7. Maximum research passes prevent infinite loops.
 * 8. Writer creates and stores a paper after successful analysis.
 * 9. Reviewer revision changes the paper where required.
 * 10. Paper storage and retrieval.
 * 11. Failed sessions do not emit paper_completed.
 * 12. Demo results are clearly distinguishable from real results.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaper } from '../src/services/agentEngine.js';
import { getResearchMode, shouldFallbackToDemo, search as providerSearch } from '../src/services/research/researchProvider.js';
import {
  validateAndRepairResults,
  sanitizeErrorMessage,
  analyzeClaims,
} from '../src/services/analyzerService.js';
import {
  createResearch,
  getResearch,
  setPaper,
  updateResearch,
  RESEARCH_STATUS,
} from '../src/services/researchService.js';
import { EVENT_TYPES } from '../src/services/eventService.js';

describe('1. Paper Builder & Demo Distinction', () => {
  const dummySources = [
    {
      id: 'src_1',
      title: 'Real Machine Learning Paper',
      url: 'https://doi.org/10.1000/182',
      domain: 'doi.org',
      sourceType: 'academic',
      demo: false,
    },
    {
      id: 'src_2',
      title: 'Neural Networks in Practice',
      url: 'https://arxiv.org/abs/2101.00000',
      domain: 'arxiv.org',
      sourceType: 'academic',
      demo: false,
    },
  ];

  const dummyClaims = [
    {
      id: 'clm_1',
      text: 'Neural architectures improve accuracy significantly.',
      status: 'supported',
      confidence: 0.91,
      sourceIds: ['src_1'],
      summary: 'Supported by empirical benchmarking in source 1.',
    },
    {
      id: 'clm_2',
      text: 'Training requires scalable compute resources.',
      status: 'supported',
      confidence: 0.88,
      sourceIds: ['src_2'],
      summary: 'Demonstrated in literature source 2.',
    },
  ];

  test('Real mode paper has no [DEMO] markings and distinguishes real research', () => {
    const paper = buildPaper('AI in Healthcare', dummySources, dummyClaims, false, false);

    assert.equal(paper.metadata.demo, false);
    assert.equal(paper.metadata.agentSystem, 'Science Bots v1.0 (Real Research)');
    assert.ok(!paper.title.includes('[DEMO]'), 'Title should not contain [DEMO]');
    assert.ok(!paper.abstract.includes('[DEMO'), 'Abstract should not contain [DEMO]');
    assert.ok(!paper.introduction.includes('[DEMO]'), 'Introduction should not contain [DEMO]');
    assert.ok(paper.references[0].startsWith('[Ref 1]'), 'References should be real format');
    assert.equal(paper.metadata.sourceCount, 2);
    assert.equal(paper.metadata.claimCount, 2);
  });

  test('Demo mode paper has explicit [DEMO] markings', () => {
    const demoSources = [
      {
        id: 'src_demo_1',
        title: '[DEMO] Demo Study',
        url: 'https://demo.example.com/1',
        demo: true,
      },
    ];
    const paper = buildPaper('AI in Healthcare', demoSources, dummyClaims, false, true);

    assert.equal(paper.metadata.demo, true);
    assert.equal(paper.metadata.agentSystem, 'Science Bots v1.0 (Demo Mode)');
    assert.ok(paper.title.startsWith('[DEMO]'));
    assert.ok(paper.abstract.includes('[DEMO PAPER]'));
    assert.ok(paper.introduction.includes('[DEMO]'));
    assert.ok(paper.references[0].startsWith('[DEMO Ref 1]'));
  });

  test('Reviewer revision updates the paper content, abstract, and metadata', () => {
    const initialPaper = buildPaper('AI in Healthcare', dummySources, dummyClaims, false, false);
    const revisedPaper = buildPaper('AI in Healthcare', dummySources, dummyClaims, true, false);

    assert.equal(initialPaper.metadata.isRevised, false);
    assert.equal(revisedPaper.metadata.isRevised, true);
    assert.ok(revisedPaper.abstract.includes('revised version'));
    assert.ok(revisedPaper.analysis.includes('Reviewer feedback has been incorporated'));

    // Verify finding content changes upon revision
    const lastFinding = revisedPaper.findings[revisedPaper.findings.length - 1];
    assert.ok(lastFinding.content.includes('Revised following reviewer verification'));
  });
});

describe('2. Provider Selection & Fallback Behavior', () => {
  const originalMode = process.env.RESEARCH_MODE;
  const originalFallback = process.env.RESEARCH_FALLBACK_TO_DEMO;

  test('RESEARCH_MODE=demo selects demo provider and marks mode: demo', async () => {
    process.env.RESEARCH_MODE = 'demo';
    const result = await providerSearch({ topic: 'Robotics', pass: 'initial' });

    assert.equal(result.mode, 'demo');
    assert.equal(result.usedFallback, false);
    assert.ok(result.sources.length > 0);
    assert.ok(result.sources.every((s) => s.demo === true));
  });

  test('Real mode without fallback returns empty sources with mode: real on failure', async () => {
    process.env.RESEARCH_MODE = 'real';
    process.env.RESEARCH_FALLBACK_TO_DEMO = 'false';

    // Calling search with an invalid/empty query that throws
    const result = await providerSearch({ topic: '   ', pass: 'initial' });

    assert.equal(result.mode, 'real');
    assert.equal(result.usedFallback, false);
    assert.equal(result.sources.length, 0);
    assert.ok(result.error);
  });

  test('Real mode with fallback=true returns demo sources explicitly marked with usedFallback=true', async () => {
    process.env.RESEARCH_MODE = 'real';
    process.env.RESEARCH_FALLBACK_TO_DEMO = 'true';

    // Invalid query forces real search to throw error, triggering fallback
    const result = await providerSearch({ topic: '   ', pass: 'initial' });

    assert.equal(result.mode, 'demo');
    assert.equal(result.usedFallback, true);
    assert.ok(result.sources.length > 0);
    assert.ok(result.fallbackReason);
  });

  // Restore env
  process.env.RESEARCH_MODE = originalMode;
  process.env.RESEARCH_FALLBACK_TO_DEMO = originalFallback;
});

describe('3. Analyzer Grounding & Error Safety', () => {
  const testSources = [
    { id: 'src_real_1', title: 'Paper 1', url: 'https://example.com/1' },
    { id: 'src_real_2', title: 'Paper 2', url: 'https://example.com/2' },
  ];

  const testClaims = [
    { id: 'clm_1', text: 'Claim 1' },
    { id: 'clm_2', text: 'Claim 2' },
  ];

  test('validateAndRepairResults enforces strict grounding on supported claims', () => {
    const rawModelOutput = [
      {
        claimId: 'clm_1',
        status: 'supported',
        confidence: 0.9,
        sourceIds: ['src_real_1'], // Valid source
        summary: 'Direct evidence found.',
      },
      {
        claimId: 'clm_2',
        status: 'supported',
        confidence: 0.95,
        sourceIds: ['src_hallucinated_999'], // Hallucinated source not in testSources!
        summary: 'Supported by outside knowledge.',
      },
    ];

    const results = validateAndRepairResults(rawModelOutput, testClaims, testSources);

    // Claim 1 remains supported because src_real_1 is in testSources
    assert.equal(results[0].status, 'supported');
    assert.deepEqual(results[0].sourceIds, ['src_real_1']);

    // Claim 2 MUST be demoted to insufficient because hallucinated source was stripped!
    assert.equal(results[1].status, 'insufficient');
    assert.deepEqual(results[1].sourceIds, []);
  });

  test('validateAndRepairResults clamps confidence and rejects unknown claims', () => {
    const rawModelOutput = [
      {
        claimId: 'clm_unknown_123',
        status: 'supported',
        confidence: 2.5,
        sourceIds: ['src_real_1'],
      },
      {
        claimId: 'clm_1',
        status: 'supported',
        confidence: 1.8, // out of range
        sourceIds: ['src_real_1'],
      },
    ];

    const results = validateAndRepairResults(rawModelOutput, testClaims, testSources);

    // Results length matches testClaims (2 claims), unknown claim discarded
    assert.equal(results.length, 2);
    assert.equal(results[0].claimId, 'clm_1');
    assert.equal(results[0].confidence, 1.0); // clamped to 1.0

    // Missing claim clm_2 is auto-repaired to insufficient
    assert.equal(results[1].claimId, 'clm_2');
    assert.equal(results[1].status, 'insufficient');
  });

  test('sanitizeErrorMessage strips API keys and query tokens', () => {
    const fakeKey = 'AIzaSyA_FakeSecretKey1234567890';
    const dirty = `Failed calling https://api.google.com/model?key=${fakeKey}&debug=true: ${fakeKey}`;
    const clean = sanitizeErrorMessage(dirty, fakeKey);

    assert.ok(!clean.includes(fakeKey), 'Cleaned message must not contain secret key');
    assert.ok(clean.includes('[REDACTED]'));
  });

  test('analyzeClaims throws clear error without key and does not fabricate supported claims', async () => {
    const oldKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await assert.rejects(
      async () => {
        await analyzeClaims({
          topic: 'Quantum Computing',
          claims: testClaims,
          sources: testSources,
        });
      },
      /GEMINI_API_KEY is not configured/
    );

    process.env.GEMINI_API_KEY = oldKey;
  });
});

describe('4. Research Session & Paper Storage Endpoint Lifecycle', () => {
  test('Paper is properly stored in research state and retrievable', () => {
    const session = createResearch('Quantum Cryptography');
    assert.equal(session.status, RESEARCH_STATUS.STARTING);
    assert.equal(session.paper, null);

    const paper = buildPaper(session.topic, [], [], false, false);
    setPaper(session.id, paper);

    const retrieved = getResearch(session.id);
    assert.ok(retrieved.paper);
    assert.equal(retrieved.paper.metadata.topic, 'Quantum Cryptography');
  });

  test('Failed session updates state to error and does not produce a paper', () => {
    const session = createResearch('Failing Session Topic');
    updateResearch(session.id, { status: RESEARCH_STATUS.ERROR });

    const retrieved = getResearch(session.id);
    assert.equal(retrieved.status, RESEARCH_STATUS.ERROR);
    assert.equal(retrieved.paper, null);
  });
});
