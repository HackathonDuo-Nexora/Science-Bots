/**
 * researchService.js
 *
 * In-memory research session management.
 * Uses a Map — no database required.
 */

import { generateResearchId } from '../utils/id.js';
import { AGENT_IDS, AGENT_STATES } from './eventService.js';

// ─── In-memory store ──────────────────────────────────────────────────────────
const sessions = new Map();

// ─── Research statuses ────────────────────────────────────────────────────────
export const RESEARCH_STATUS = {
  STARTING:  'starting',
  RUNNING:   'running',
  COMPLETED: 'completed',
  ERROR:     'error',
};

/**
 * Build the default agents map — all agents start idle.
 */
function buildDefaultAgents() {
  return Object.fromEntries(
    Object.values(AGENT_IDS).map((id) => [
      id,
      { id, state: AGENT_STATES.IDLE, action: null, message: null },
    ])
  );
}

/**
 * Create a new research session.
 * @param {string} topic
 * @returns {object} New research session
 */
export function createResearch(topic) {
  const id  = generateResearchId();
  const now = new Date().toISOString();

  const session = {
    id,
    topic,
    status:       RESEARCH_STATUS.STARTING,
    currentAgent: null,
    agents:       buildDefaultAgents(),
    sources:      [],
    claims:       [],
    paper:        null,
    events:       [],
    createdAt:    now,
    updatedAt:    now,
  };

  sessions.set(id, session);
  return session;
}

/**
 * Get a research session by ID.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getResearch(id) {
  return sessions.get(id);
}

/**
 * Update top-level fields of a research session.
 * @param {string} id
 * @param {object} updates - Partial session fields
 * @returns {object|null} Updated session or null if not found
 */
export function updateResearch(id, updates) {
  const session = sessions.get(id);
  if (!session) return null;

  Object.assign(session, updates, { updatedAt: new Date().toISOString() });
  return session;
}

/**
 * Update a specific agent's state within a session.
 * @param {string} researchId
 * @param {string} agentId
 * @param {object} agentUpdate - Partial agent fields
 * @returns {object|null} Updated session or null
 */
export function updateAgent(researchId, agentId, agentUpdate) {
  const session = sessions.get(researchId);
  if (!session) return null;
  if (!session.agents[agentId]) return null;

  Object.assign(session.agents[agentId], agentUpdate);
  session.updatedAt = new Date().toISOString();
  return session;
}

/**
 * Add a source to a research session.
 * @param {string} researchId
 * @param {object} source
 * @returns {object|null} Updated session
 */
export function addSource(researchId, source) {
  const session = sessions.get(researchId);
  if (!session) return null;

  session.sources.push({ ...source, addedAt: new Date().toISOString() });
  session.updatedAt = new Date().toISOString();
  return session;
}

/**
 * Add or update a verified claim in a research session.
 * @param {string} researchId
 * @param {object} claim
 * @returns {object|null} Updated session
 */
export function addClaim(researchId, claim) {
  const session = sessions.get(researchId);
  if (!session) return null;

  const existingIdx = session.claims.findIndex((c) => c.id === claim.id);
  if (existingIdx >= 0) {
    session.claims[existingIdx] = {
      ...session.claims[existingIdx],
      ...claim,
      updatedAt: new Date().toISOString(),
    };
  } else {
    session.claims.push({ ...claim, addedAt: new Date().toISOString() });
  }

  session.updatedAt = new Date().toISOString();
  return session;
}

/**
 * Set the generated paper on a research session.
 * @param {string} researchId
 * @param {object} paper
 * @returns {object|null} Updated session
 */
export function setPaper(researchId, paper) {
  const session = sessions.get(researchId);
  if (!session) return null;

  session.paper     = paper;
  session.updatedAt = new Date().toISOString();
  return session;
}

/**
 * Append a canonical event to a session's event log.
 * @param {string} researchId
 * @param {object} event
 * @returns {object|null} Updated session
 */
export function appendEvent(researchId, event) {
  const session = sessions.get(researchId);
  if (!session) return null;

  session.events.push(event);
  session.updatedAt = new Date().toISOString();
  return session;
}
