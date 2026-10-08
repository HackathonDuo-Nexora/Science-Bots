/**
 * id.js — Generates canonical event and research IDs.
 */

/**
 * Generate a research session ID.
 * @returns {string} e.g. "res_a1b2c3d4e5f6..."
 */
export function generateResearchId() {
  return `res_${crypto.randomUUID().replace(/-/g, '')}`;
}

/**
 * Generate an event ID.
 * @returns {string} e.g. "evt_a1b2c3d4e5f6..."
 */
export function generateEventId() {
  return `evt_${crypto.randomUUID().replace(/-/g, '')}`;
}
