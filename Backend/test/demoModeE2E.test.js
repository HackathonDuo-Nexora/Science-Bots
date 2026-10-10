/**
 * demoModeE2E.test.js
 *
 * Validates that demo mode runs its full deterministic workflow:
 * 1. Executes without requiring GEMINI_API_KEY.
 * 2. Emits canonical SSE events throughout the pipeline.
 * 3. Builds a demo paper clearly marked as demo data.
 * 4. Incorporates reviewer feedback via revision loop.
 * 5. Emits paper_completed and reaches COMPLETED status.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResearch, getResearch, RESEARCH_STATUS } from '../src/services/researchService.js';
import { runWorkflow } from '../src/services/agentEngine.js';
import { EVENT_TYPES } from '../src/services/eventService.js';

test('Demo mode executes complete deterministic workflow and generates demo paper', { timeout: 60000 }, async () => {
  const origMode = process.env.RESEARCH_MODE;
  const origKey = process.env.GEMINI_API_KEY;

  process.env.RESEARCH_MODE = 'demo';
  // Ensure demo mode runs even if GEMINI_API_KEY is not set
  delete process.env.GEMINI_API_KEY;

  try {
    const session = createResearch('Autonomous Multi-Agent Architectures');
    await runWorkflow(session.id, 'Autonomous Multi-Agent Architectures');

    const completed = getResearch(session.id);

    // 1. Session status must be completed
    assert.equal(completed.status, RESEARCH_STATUS.COMPLETED);

    // 2. Paper must exist and be clearly identified as demo
    assert.ok(completed.paper, 'Paper must be generated');
    assert.equal(completed.paper.metadata.demo, true);
    assert.equal(completed.paper.metadata.agentSystem, 'Science Bots v1.0 (Demo Mode)');
    assert.ok(completed.paper.title.startsWith('[DEMO]'));
    assert.equal(completed.paper.metadata.isRevised, true);

    // 3. Must have emitted canonical events
    const eventTypes = completed.events.map((e) => e.type);
    assert.ok(eventTypes.includes(EVENT_TYPES.SOURCE_FOUND));
    assert.ok(eventTypes.includes(EVENT_TYPES.INSUFFICIENT_EVIDENCE));
    assert.ok(eventTypes.includes(EVENT_TYPES.CLAIM_VERIFIED));
    assert.ok(eventTypes.includes(EVENT_TYPES.PAPER_UPDATED));
    assert.ok(eventTypes.includes(EVENT_TYPES.REVISION_REQUIRED));
    assert.ok(eventTypes.includes(EVENT_TYPES.PAPER_COMPLETED));

    // 4. Sources count
    assert.equal(completed.sources.length, 4); // 3 initial + 1 supplementary
    assert.ok(completed.sources.every((s) => s.demo === true));
  } finally {
    process.env.RESEARCH_MODE = origMode;
    if (origKey) process.env.GEMINI_API_KEY = origKey;
  }
});
