import type { EventType, ResearchEvent } from './types'

export const PRE_PAPER_PROGRESS_CAP = 95

const MILESTONE_FLOOR: Partial<Record<EventType, number>> = {
  agent_status: 8,
  handoff: 14,
  evidence_found: 22,
  insufficient_evidence: 34,
  claim_verified: 48,
  conflict_detected: 46,
  draft_updated: 70,
  revision_required: 80,
}

const MILESTONE_INCREMENT: Partial<Record<EventType, number>> = {
  agent_status: 2,
  handoff: 3,
  evidence_found: 5,
  claim_verified: 4,
  insufficient_evidence: 3,
  revision_required: 3,
  conflict_detected: 3,
  draft_updated: 8,
}

/**
 * Derive mission progress from workflow events. Never returns 100 unless
 * paper_final includes the retrieved paper payload.
 */
export function computeMissionProgress(current: number, event: ResearchEvent): number {
  if (event.type === 'error') return current

  const hasPaper = event.type === 'paper_final' && Boolean(event.payload?.paper)
  if (hasPaper) return 100

  let next = current
  const provided = event.payload?.progress
  if (typeof provided === 'number' && Number.isFinite(provided)) {
    const capped = provided >= 100 ? PRE_PAPER_PROGRESS_CAP : provided
    next = Math.max(next, capped)
  }

  next = Math.max(
    next,
    MILESTONE_FLOOR[event.type] ?? 0,
    current + (MILESTONE_INCREMENT[event.type] ?? 0),
  )

  return Math.min(PRE_PAPER_PROGRESS_CAP, next)
}
