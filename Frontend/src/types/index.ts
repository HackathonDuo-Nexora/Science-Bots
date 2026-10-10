// ============================================================
// SCIENCE BOTS — Core TypeScript Types
// All types that flow through the event/store layer.
// The backend teammate must conform to this contract.
// ============================================================

// ─────────────────────────────────────────────
// Agent identifiers
// ─────────────────────────────────────────────

export type AgentId =
  | 'orchestrator'
  | 'researcher'
  | 'analyzer'
  | 'writer'
  | 'reviewer'

export const AGENT_IDS: AgentId[] = [
  'orchestrator',
  'researcher',
  'analyzer',
  'writer',
  'reviewer',
]

// ─────────────────────────────────────────────
// Agent state machine
// ─────────────────────────────────────────────

export type AgentStatus =
  | 'idle'
  | 'working'
  | 'tool_calling'
  | 'waiting'
  | 'verifying'
  | 'needs_research'
  | 'completed'
  | 'error'

export interface AgentState {
  id: AgentId
  status: AgentStatus
  /** Short human-readable status line shown under agent label */
  statusLine: string
  /** Whether this agent is the one currently animated as "active" */
  isActive: boolean
}

// ─────────────────────────────────────────────
// Research event types
// ─────────────────────────────────────────────

export type EventType =
  | 'agent_status'   // agent changed state
  | 'handoff'        // work passed from one agent to another
  | 'evidence_found' // researcher found a source
  | 'claim_verified' // claim verification completed
  | 'conflict_detected' // reviewer flagged a conflict
  | 'insufficient_evidence' // analyzer requested more sources
  | 'revision_required' // reviewer requested a draft revision
  | 'draft_updated'  // writer produced/updated draft
  | 'paper_final'    // mission complete, final paper ready
  | 'error'          // something went wrong

/** Packet type carried during a handoff animation */
export type HandoffPacketType = 'evidence' | 'draft' | 'conflict'

export interface ResearchEvent {
  id: string
  /** ISO-8601 timestamp */
  ts: string
  type: EventType
  /** Agent that emitted this event */
  agent: AgentId
  /** Target agent (used for handoff events) */
  to?: AgentId
  /** New status of the agent after this event */
  status?: AgentStatus
  /** Short, safe, human-readable message for the Activity panel */
  message: string
  payload?: EventPayload
}

export interface EventPayload {
  claimId?: string
  evidenceIds?: string[]
  sourceIds?: string[]
  /** Mission progress 0–100 */
  progress?: number
  /** For handoff events: what kind of packet is travelling */
  packetType?: HandoffPacketType
  /** For paper_final events */
  paper?: FinalPaper
  /** For claim events */
  claim?: Claim
}

// ─────────────────────────────────────────────
// Evidence, Sources, Claims
// ─────────────────────────────────────────────

export type VerificationStatus =
  | 'pending'
  | 'supported'
  | 'conflict'
  | 'unsupported'

export interface Source {
  id: string
  title: string
  url?: string
  /** Short excerpt or quote */
  excerpt?: string
  /** Whether this source supports or contradicts the claim */
  stance?: 'supports' | 'contradicts' | 'neutral'
}

export interface Evidence {
  id: string
  claimId: string
  sourceId: string
  text: string
  foundAt: string // ISO-8601
}

export interface Claim {
  id: string
  text: string
  verificationStatus: VerificationStatus
  evidenceIds: string[]
  sourceIds: string[]
  /** If conflicted, the competing source IDs */
  conflictingSourceIds?: string[]
  /** Backend confidence 0–1 when supplied */
  confidence?: number
}

export interface VerificationResult {
  claimId: string
  status: VerificationStatus
  supportingSourceIds: string[]
  contradictingSourceIds: string[]
  verifiedAt: string // ISO-8601
}

// ─────────────────────────────────────────────
// Final paper
// ─────────────────────────────────────────────

export interface PaperSection {
  title: string
  content: string
}

export interface FinalPaper {
  title: string
  abstract: string
  keyFindings: string[]
  sections: PaperSection[]
  /** Inline citation numbers map to source IDs */
  citations: Record<string, string> // e.g. { "1": "src_abc" }
  sources: Source[]
  generatedAt: string // ISO-8601
}

// ─────────────────────────────────────────────
// Route identifiers (connections between agents)
// ─────────────────────────────────────────────

export type RouteId =
  | 'orchestrator-researcher'
  | 'orchestrator-analyzer'
  | 'orchestrator-writer'
  | 'orchestrator-reviewer'
  | 'researcher-analyzer'
  | 'analyzer-writer'
  | 'writer-reviewer'

export function getRouteId(from: AgentId, to: AgentId): RouteId | null {
  const key = `${from}-${to}` as RouteId
  const reverse = `${to}-${from}` as RouteId
  const valid: RouteId[] = [
    'orchestrator-researcher',
    'orchestrator-analyzer',
    'orchestrator-writer',
    'orchestrator-reviewer',
    'researcher-analyzer',
    'analyzer-writer',
    'writer-reviewer',
  ]
  if (valid.includes(key)) return key
  if (valid.includes(reverse)) return reverse
  return null
}

// ─────────────────────────────────────────────
// In-flight handoff packet (for animation layer)
// ─────────────────────────────────────────────

export interface HandoffPacketState {
  id: string
  from: AgentId
  to: AgentId
  packetType: HandoffPacketType
  /** 0–1 progress along the route */
  progress: number
  startedAt: number // performance.now()
  durationMs: number
}

// ─────────────────────────────────────────────
// Application phase
// ─────────────────────────────────────────────

export type AppPhase =
  | 'start'
  | 'loading'
  | 'active'
  | 'completed'
  | 'error'
  | 'disconnected'
