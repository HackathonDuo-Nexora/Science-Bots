/**
 * evidenceVerification.test.js
 *
 * Automated test suite verifying evidence verification invariants:
 * 1. Unrelated sources rejected (e.g., Empirical Finance rejected for Medical Diagnosis).
 * 2. Zero evidence handling (claims with 0 evidence are never marked SUPPORTED).
 * 3. Relevant supporting evidence (valid scholarly evidence correctly marked SUPPORTED).
 * 4. Inconclusive & conflicting evidence handling (demoted to INSUFFICIENT or CONFLICT).
 * 5. Reviewer decision & count consistency.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRelevance,
  isSourceRelevant,
} from '../src/services/research/realResearchProvider.js';
import {
  validateAndRepairResults,
  fallbackHeuristicEvaluation,
} from '../src/services/analyzerService.js';
import { buildPaper } from '../src/services/agentEngine.js';

describe('1. Unrelated Sources Rejection', () => {
  const missionTopic = 'Agentic AI in Medical Diagnosis';

  test('Rejects "The Last Paper - Agentic AI and the Governance of Empirical Finance" for Medical Diagnosis', () => {
    const unrelatedTitle = 'The Last Paper - Agentic AI and the Governance of Empirical Finance';
    const unrelatedSnippet = 'We examine agentic AI systems within empirical finance, asset pricing, portfolio optimization, and market governance.';

    const score = calculateRelevance(missionTopic, unrelatedTitle, unrelatedSnippet);
    const isRelevant = isSourceRelevant(missionTopic, unrelatedTitle, unrelatedSnippet);

    assert.equal(score, 0.0, 'Relevance score for contrasting domain must be 0.0');
    assert.equal(isRelevant, false, 'Unrelated financial source must be rejected for medical diagnosis');
  });

  test('Accepts authentic relevant medical diagnosis paper', () => {
    const relevantTitle = 'Agentic AI in Healthcare: Medical Diagnosis and Treatment';
    const relevantSnippet = 'Empirical evaluation of multi-agent LLM systems in clinical medical diagnosis across 500 patient cases.';

    const score = calculateRelevance(missionTopic, relevantTitle, relevantSnippet);
    const isRelevant = isSourceRelevant(missionTopic, relevantTitle, relevantSnippet);

    assert.ok(score >= 0.70, `Relevant source should have high relevance score, got: ${score}`);
    assert.equal(isRelevant, true, 'Relevant medical source must be accepted');
  });

  test('validateAndRepairResults strips unrelated source and demotes claim to insufficient', () => {
    const unrelatedSource = {
      id: 'src_finance_1',
      title: 'Agentic AI in Empirical Finance',
      snippet: 'Asset pricing and stock market trading using agentic AI models.',
      relevance: 0.0,
    };

    const claim = {
      id: 'clm_1',
      text: 'Agentic AI accelerates clinical diagnosis in oncology.',
      sourceIds: ['src_finance_1'],
      evidenceIds: ['ev_finance_1'],
    };

    const rawModelOutput = [
      {
        claimId: 'clm_1',
        status: 'supported',
        confidence: 0.90,
        sourceIds: ['src_finance_1'],
        evidenceIds: ['ev_finance_1'],
        summary: 'Supported by finance literature.',
      },
    ];

    const results = validateAndRepairResults(rawModelOutput, [claim], [unrelatedSource], missionTopic);

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'insufficient', 'Must demote claim citing unrelated source to insufficient');
    assert.equal(results[0].sourceIds.length, 0, 'Unrelated source must be stripped');
    assert.equal(results[0].evidenceIds.length, 0, 'Evidence IDs must be cleared');
  });
});

describe('2. Zero Evidence Handling', () => {
  const missionTopic = 'Agentic AI in Medical Diagnosis';
  const relevantSource = {
    id: 'src_med_1',
    title: 'Agentic AI in Clinical Pathology',
    snippet: 'Overview of clinical pathology frameworks.',
    relevance: 0.85,
  };

  test('Model output "supported" with zero evidence is demoted to "insufficient"', () => {
    const claimWithZeroEvidence = {
      id: 'clm_zero',
      text: 'Agentic workflows reduce diagnostic false negatives by 24%.',
      sourceIds: ['src_med_1'],
      evidenceIds: [], // 0 evidence!
    };

    const rawModelOutput = [
      {
        claimId: 'clm_zero',
        status: 'supported', // Model hallucinates supported!
        confidence: 0.85,
        sourceIds: ['src_med_1'],
        evidenceIds: [], // 0 evidence!
        summary: 'Corroborated by general knowledge.',
      },
    ];

    const results = validateAndRepairResults(
      rawModelOutput,
      [claimWithZeroEvidence],
      [relevantSource],
      missionTopic
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'insufficient', 'Claim with 0 evidence must never be marked supported');
    assert.equal(results[0].evidenceIds.length, 0);
    assert.ok(results[0].confidence <= 0.45, 'Confidence must be capped on insufficient evidence');
  });

  test('fallbackHeuristicEvaluation never marks claims supported if evidence is empty', () => {
    const claimWithoutEvidence = {
      id: 'clm_empty_ev',
      text: 'Diagnostic accuracy surpasses baseline human clinicians.',
      sourceIds: ['src_med_1'],
      evidenceIds: [],
    };

    const evaluations = fallbackHeuristicEvaluation(
      [claimWithoutEvidence],
      [relevantSource],
      missionTopic
    );

    assert.equal(evaluations.length, 1);
    assert.equal(evaluations[0].status, 'insufficient', 'Fallback heuristic must never mark 0-evidence claims supported');
    assert.equal(evaluations[0].evidenceIds.length, 0);
  });
});

describe('3. Relevant Supporting Evidence', () => {
  const missionTopic = 'Agentic AI in Medical Diagnosis';
  const medicalSource = {
    id: 'src_med_1',
    title: 'Multi-Agent LLMs for Clinical Diagnosis',
    snippet: 'Empirical multi-site evaluation across 500 clinical cases shows 94.2% diagnostic accuracy.',
    relevance: 0.90,
  };

  test('Valid evidence and relevant source results in "supported" with consistent counts', () => {
    const supportedClaim = {
      id: 'clm_supported',
      text: 'Multi-agent workflows demonstrate 94.2% accuracy in clinical diagnosis.',
      sourceIds: ['src_med_1'],
      evidenceIds: ['ev_med_1'],
    };

    const rawModelOutput = [
      {
        claimId: 'clm_supported',
        status: 'supported',
        confidence: 0.92,
        sourceIds: ['src_med_1'],
        evidenceIds: ['ev_med_1'],
        summary: 'Direct empirical data confirms diagnostic accuracy in clinical cases.',
      },
    ];

    const results = validateAndRepairResults(
      rawModelOutput,
      [supportedClaim],
      [medicalSource],
      missionTopic
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'supported');
    assert.equal(results[0].sourceIds.length, 1);
    assert.equal(results[0].evidenceIds.length, 1);
    assert.equal(results[0].sourceIds[0], 'src_med_1');
    assert.equal(results[0].evidenceIds[0], 'ev_med_1');
    assert.ok(results[0].confidence >= 0.60);
  });
});

describe('4. Inconclusive & Conflicting Evidence', () => {
  const missionTopic = 'Agentic AI in Medical Diagnosis';
  const sourceA = {
    id: 'src_a',
    title: 'Trial A on Diagnostic AI Systems',
    snippet: 'AI assistance improves physician accuracy by 15% in emergency rooms.',
    relevance: 0.85,
  };
  const sourceB = {
    id: 'src_b',
    title: 'Trial B on Clinical Decision Automation',
    snippet: 'AI assistance did not produce statistically significant improvement in diagnosis accuracy.',
    relevance: 0.85,
  };

  test('Conflicting evidence is preserved as "conflict"', () => {
    const claim = {
      id: 'clm_conflict',
      text: 'AI assistance reliably improves clinical diagnosis outcomes.',
      sourceIds: ['src_a', 'src_b'],
      evidenceIds: ['ev_a', 'ev_b'],
    };

    const rawModelOutput = [
      {
        claimId: 'clm_conflict',
        status: 'conflict',
        confidence: 0.88,
        sourceIds: ['src_a', 'src_b'],
        evidenceIds: ['ev_a', 'ev_b'],
        summary: 'Trial A observed positive impact while Trial B found no statistically significant difference.',
      },
    ];

    const results = validateAndRepairResults(rawModelOutput, [claim], [sourceA, sourceB], missionTopic);

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'conflict');
    assert.equal(results[0].sourceIds.length, 2);
  });

  test('Low-confidence or inconclusive evidence is demoted to "insufficient"', () => {
    const claim = {
      id: 'clm_weak',
      text: 'Preliminary pilot suggests potential utility.',
      sourceIds: ['src_a'],
      evidenceIds: ['ev_a'],
    };

    const rawModelOutput = [
      {
        claimId: 'clm_weak',
        status: 'supported',
        confidence: 0.40, // Low confidence / inconclusive
        sourceIds: ['src_a'],
        evidenceIds: ['ev_a'],
        summary: 'Inconclusive pilot study results.',
      },
    ];

    const results = validateAndRepairResults(rawModelOutput, [claim], [sourceA], missionTopic);

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'insufficient', 'Low confidence evidence must be demoted to insufficient');
  });
});

describe('5. Paper & Reviewer Consistency', () => {
  test('Paper findings reflect INSUFFICIENT EVIDENCE / UNVERIFIED when claim is insufficient', () => {
    const sources = [
      { id: 'src_1', title: 'Paper 1', url: 'https://doi.org/10.1000/1', domain: 'doi.org' },
    ];
    const claims = [
      {
        id: 'clm_1',
        text: 'Zero-shot diagnosis requires extensive clinical trial validation.',
        status: 'insufficient',
        confidence: 0.35,
        sourceIds: ['src_1'],
        evidenceIds: [],
        summary: 'Insufficient direct evidence found in retrieved literature.',
      },
    ];

    const paper = buildPaper('Agentic AI in Medical Diagnosis', sources, claims, false, false);

    assert.equal(paper.metadata.claimCount, 0, 'Supported claim count must be 0 when claim is insufficient');
    assert.ok(
      paper.findings[0].content.includes('INSUFFICIENT EVIDENCE / UNVERIFIED'),
      'Finding must indicate INSUFFICIENT EVIDENCE / UNVERIFIED'
    );
  });
});
