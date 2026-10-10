/**
 * emptySearchRealMode.test.js
 *
 * Validates that an empty real search result:
 * 1. Does NOT satisfy demo detection.
 * 2. Does NOT trigger demo output or demo paper.
 * 3. Does NOT emit paper_completed.
 * 4. Halts with an honest error event.
 * 5. Updates session status to 'error'.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResearch, getResearch, RESEARCH_STATUS } from '../src/services/researchService.js';
import { runWorkflow } from '../src/services/agentEngine.js';
import { EVENT_TYPES } from '../src/services/eventService.js';

test('Empty real search result does NOT trigger demo workflow and fails honestly', async () => {
  // Set real mode with fallback disabled
  const origMode = process.env.RESEARCH_MODE;
  const origFallback = process.env.RESEARCH_FALLBACK_TO_DEMO;
  process.env.RESEARCH_MODE = 'real';
  process.env.RESEARCH_FALLBACK_TO_DEMO = 'false';

  try {
    // A blank/whitespace topic that will cause realSearch to fail with 0 sources
    const session = createResearch('   ');

    await runWorkflow(session.id, '   ');

    const updated = getResearch(session.id);

    // 1. Session must be in ERROR status, NOT completed
    assert.equal(updated.status, RESEARCH_STATUS.ERROR);

    // 2. Paper must NOT have been generated
    assert.equal(updated.paper, null);

    // 3. Must NOT have emitted paper_completed
    const paperCompletedEvents = updated.events.filter((e) => e.type === EVENT_TYPES.PAPER_COMPLETED);
    assert.equal(paperCompletedEvents.length, 0, 'Must NOT emit paper_completed event on failure');

    // 4. Must have emitted an ERROR event
    const errorEvents = updated.events.filter((e) => e.type === EVENT_TYPES.ERROR);
    assert.ok(errorEvents.length > 0, 'Must emit an error event');
    assert.equal(errorEvents[0].agent, 'researcher');

    // 5. Must NOT contain demo sources
    assert.equal(updated.sources.length, 0);
  } finally {
    process.env.RESEARCH_MODE = origMode;
    process.env.RESEARCH_FALLBACK_TO_DEMO = origFallback;
  }
});
