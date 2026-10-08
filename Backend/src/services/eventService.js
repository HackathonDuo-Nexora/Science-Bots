/**
 * eventService.js
 *
 * Manages SSE clients and canonical event creation/broadcasting.
 * Canonical event contract must not be changed.
 */

import { generateEventId } from '../utils/id.js';

// Map<researchId, Set<response>>
const clients = new Map();

// ─── Canonical event types ────────────────────────────────────────────────────
export const EVENT_TYPES = {
  RESEARCH_STARTED:      'research_started',
  AGENT_UPDATE:          'agent_update',
  HANDOFF:               'handoff',
  SOURCE_FOUND:          'source_found',
  CLAIM_VERIFIED:        'claim_verified',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
  CONFLICT_DETECTED:     'conflict_detected',
  REVISION_REQUIRED:     'revision_required',
  PAPER_UPDATED:         'paper_updated',
  PAPER_COMPLETED:       'paper_completed',
  ERROR:                 'error',
};

// ─── Agent IDs ────────────────────────────────────────────────────────────────
export const AGENT_IDS = {
  ORCHESTRATOR: 'orchestrator',
  RESEARCHER:   'researcher',
  ANALYZER:     'analyzer',
  WRITER:       'writer',
  REVIEWER:     'reviewer',
};

// ─── Agent states ─────────────────────────────────────────────────────────────
export const AGENT_STATES = {
  IDLE:             'idle',
  WORKING:          'working',
  TOOL_CALLING:     'tool_calling',
  WAITING:          'waiting',
  VERIFYING:        'verifying',
  NEEDS_RESEARCH:   'needs_research',
  COMPLETED:        'completed',
  ERROR:            'error',
};

/**
 * Create a canonical event object.
 *
 * @param {object} opts
 * @param {string} opts.type         - One of EVENT_TYPES
 * @param {string|null} [opts.agent] - Agent ID
 * @param {string|null} [opts.status]- Agent state
 * @param {string|null} [opts.action]- Short action label
 * @param {string}      opts.message - Human-readable message
 * @param {string|null} [opts.to]    - Destination agent (for handoffs)
 * @param {object}      [opts.payload] - Extra data
 * @returns {object} Canonical event
 */
export function createEvent({
  type,
  agent = null,
  status = null,
  action = null,
  message,
  to = null,
  payload = {},
}) {
  return {
    id:        generateEventId(),
    timestamp: new Date().toISOString(),
    type,
    agent,
    status,
    action,
    message,
    to,
    payload,
  };
}

/**
 * Subscribe a response object to a research session's SSE stream.
 * @param {string}   researchId
 * @param {object}   res - Express response
 */
export function subscribe(researchId, res) {
  if (!clients.has(researchId)) {
    clients.set(researchId, new Set());
  }
  clients.get(researchId).add(res);
}

/**
 * Unsubscribe a response from a research session.
 * @param {string} researchId
 * @param {object} res
 */
export function unsubscribe(researchId, res) {
  const sessionClients = clients.get(researchId);
  if (sessionClients) {
    sessionClients.delete(res);
    if (sessionClients.size === 0) {
      clients.delete(researchId);
    }
  }
}

/**
 * Broadcast a canonical event to all SSE clients of a research session.
 * Sends in the format:
 *   event: <type>\n
 *   data: <json>\n\n
 *
 * @param {string} researchId
 * @param {object} event - Canonical event object
 */
export function emit(researchId, event) {
  const sessionClients = clients.get(researchId);
  if (!sessionClients || sessionClients.size === 0) return;

  const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

  for (const res of sessionClients) {
    try {
      res.write(chunk);
    } catch {
      // Client disconnected mid-write — clean up
      sessionClients.delete(res);
    }
  }
}

/**
 * Returns the number of active SSE clients for a session.
 * @param {string} researchId
 * @returns {number}
 */
export function clientCount(researchId) {
  return clients.get(researchId)?.size ?? 0;
}
