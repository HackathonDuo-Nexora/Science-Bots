/**
 * researchController.js
 *
 * HTTP handlers for all research-related routes.
 * Delegates to researchService, eventService, and agentEngine.
 */

import {
  createResearch,
  getResearch,
  appendEvent,
  RESEARCH_STATUS,
} from '../services/researchService.js';

import {
  createEvent,
  emit,
  subscribe,
  unsubscribe,
  EVENT_TYPES,
} from '../services/eventService.js';

import { startDemoResearch } from '../services/agentEngine.js';

// ─── POST /api/research ───────────────────────────────────────────────────────

/**
 * Start a new research session.
 * Body: { topic: string }
 */
export async function startResearch(req, res) {
  const { topic } = req.body ?? {};

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'topic is required and must be a non-empty string.',
    });
  }

  const session = createResearch(topic.trim());

  // Emit research_started event immediately
  const event = createEvent({
    type:    EVENT_TYPES.RESEARCH_STARTED,
    agent:   null,
    status:  null,
    action:  'started',
    message: `Research session started for topic: "${session.topic}"`,
    payload: { topic: session.topic },
  });

  appendEvent(session.id, event);
  // Emit to any already-connected SSE clients (none yet, but correct pattern)
  emit(session.id, event);

  // Fire-and-forget — starts the demo agent workflow asynchronously.
  // The HTTP response is returned immediately; events arrive via SSE.
  startDemoResearch(session.id);

  return res.status(201).json({
    success:    true,
    researchId: session.id,
    status:     session.status,
  });
}

// ─── GET /api/research/:id ────────────────────────────────────────────────────

/**
 * Get full research session state.
 */
export function getResearchById(req, res) {
  const { id } = req.params;
  const session = getResearch(id);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: `Research session "${id}" not found.`,
    });
  }

  return res.json({ success: true, research: session });
}

// ─── GET /api/research/:id/events ────────────────────────────────────────────

/**
 * SSE stream for a research session.
 * Compatible with browser EventSource API.
 */
export function streamEvents(req, res) {
  const { id } = req.params;
  const session = getResearch(id);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: `Research session "${id}" not found.`,
    });
  }

  // ── SSE headers ────────────────────────────────────────────────────────────
  res.setHeader('Content-Type',                'text/event-stream');
  res.setHeader('Cache-Control',               'no-cache');
  res.setHeader('Connection',                  'keep-alive');
  res.setHeader('X-Accel-Buffering',           'no'); // disable nginx buffering
  res.flushHeaders();

  // ── Subscribe ──────────────────────────────────────────────────────────────
  subscribe(id, res);

  // ── Send connected confirmation ────────────────────────────────────────────
  const connectedPayload = JSON.stringify({ researchId: id });
  res.write(`event: connected\ndata: ${connectedPayload}\n\n`);

  // ── Replay past events so the client is in sync ───────────────────────────
  for (const event of session.events) {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  }

  // ── Heartbeat — keep connection alive through proxies ─────────────────────
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  // ── Cleanup on disconnect ──────────────────────────────────────────────────
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe(id, res);
  });
}

// ─── GET /api/research/:id/paper ─────────────────────────────────────────────

/**
 * Get the generated paper for a research session.
 */
export function getPaper(req, res) {
  const { id } = req.params;
  const session = getResearch(id);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: `Research session "${id}" not found.`,
    });
  }

  if (!session.paper) {
    return res.status(202).json({
      success: false,
      message: 'Research paper is not ready yet.',
    });
  }

  return res.json({ success: true, paper: session.paper });
}
