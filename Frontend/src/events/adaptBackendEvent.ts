// ============================================================
// Backend → frontend event/paper adapters
// Pure functions. Do not change the backend event contract.
// ============================================================

import type {
  AgentId,
  AgentStatus,
  Claim,
  EventType,
  FinalPaper,
  ResearchEvent,
  Source,
  VerificationStatus,
} from '../types'

export type BackendEventType =
  | 'research_started'
  | 'agent_update'
  | 'handoff'
  | 'source_found'
  | 'claim_verified'
  | 'insufficient_evidence'
  | 'conflict_detected'
  | 'revision_required'
  | 'paper_updated'
  | 'paper_completed'
  | 'error'

export interface BackendEvent {
  id: string
  timestamp: string
  type: BackendEventType
  agent: string | null
  status: string | null
  action: string | null
  message: string
  to: string | null
  payload: Record<string, unknown>
}

export interface BackendPaper {
  title: string
  abstract: string
  introduction: string
  findings: Array<{ heading: string; content: string }>
  analysis: string
  conclusion: string
  references: string[]
  claims: Array<{ id: string; text: string; status: string; confidence?: number; sourceIds?: string[] }>
  metadata: {
    generatedAt: string
    demo: boolean
    sourceCount: number
    topic: string
  }
}

export interface BackendSessionSource {
  id: string
  title: string
  url?: string
  snippet?: string
  excerpt?: string
}

export const BACKEND_EVENT_TYPES: BackendEventType[] = [
  'research_started', 'agent_update', 'handoff', 'source_found',
  'claim_verified', 'insufficient_evidence', 'conflict_detected',
  'revision_required', 'paper_updated', 'paper_completed', 'error',
]

export function mapEventType(backendType: BackendEventType): EventType {
  switch (backendType) {
    case 'agent_update':
    case 'research_started':
      return 'agent_status'
    case 'source_found':
      return 'evidence_found'
    case 'paper_updated':
      return 'draft_updated'
    case 'paper_completed':
      return 'paper_final'
    case 'insufficient_evidence':
      return 'insufficient_evidence'
    case 'revision_required':
      return 'revision_required'
    case 'conflict_detected':
      return 'conflict_detected'
    case 'claim_verified':
      return 'claim_verified'
    case 'handoff':
      return 'handoff'
    case 'error':
      return 'error'
    default:
      return 'agent_status'
  }
}

export function mapStatus(backendStatus: string | null): AgentStatus | undefined {
  if (!backendStatus) return undefined
  const valid: AgentStatus[] = [
    'idle', 'working', 'tool_calling', 'waiting',
    'verifying', 'needs_research', 'completed', 'error',
  ]
  return valid.includes(backendStatus as AgentStatus)
    ? (backendStatus as AgentStatus)
    : 'working'
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function mapVerificationStatus(be: BackendEvent, rawStatus: unknown): VerificationStatus {
  const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase().trim() : ''
  if (status === 'supported') return 'supported'
  if (status === 'conflict') return 'conflict'
  if (status === 'unsupported' || status === 'insufficient') return 'unsupported'
  if (status === 'pending') return 'pending'

  if (be.type === 'claim_verified') return 'supported'
  if (be.type === 'conflict_detected') return 'conflict'
  if (be.type === 'insufficient_evidence') return 'unsupported'
  return 'pending'
}

/**
 * Build a claim only from identifiers the backend actually sent.
 * Demo CLAIM_VERIFIED uses payload.id; real mode uses payload.claimId.
 * payload.claim as a string (insufficient_evidence demo) is not an id.
 */
export function extractClaim(be: BackendEvent): Claim | undefined {
  const payload = be.payload ?? {}
  const nested = asRecord(payload.claim)

  const id =
    asNonEmptyString(payload.claimId) ??
    asNonEmptyString(payload.id) ??
    asNonEmptyString(nested?.claimId) ??
    asNonEmptyString(nested?.id)

  if (!id) return undefined

  const text =
    asNonEmptyString(payload.text) ??
    asNonEmptyString(nested?.text) ??
    asNonEmptyString(payload.summary) ??
    asNonEmptyString(nested?.summary) ??
    ''

  const sourceIds = asStringArray(payload.sourceIds).length > 0
    ? asStringArray(payload.sourceIds)
    : asStringArray(nested?.sourceIds)

  const confidence =
    asFiniteNumber(payload.confidence) ?? asFiniteNumber(nested?.confidence)

  const evidenceIds = asStringArray(payload.evidenceIds).length > 0
    ? asStringArray(payload.evidenceIds)
    : asStringArray(nested?.evidenceIds)

  let verificationStatus = mapVerificationStatus(be, payload.status ?? nested?.status)

  // Invariant: Only mark a claim supported when relevant retrieved evidence directly supports that claim.
  // If evidence count or source count is 0, demote to unsupported (insufficient evidence).
  if (verificationStatus === 'supported' && (evidenceIds.length === 0 || sourceIds.length === 0)) {
    verificationStatus = 'unsupported'
  }

  const claim: Claim = {
    id,
    text,
    verificationStatus,
    evidenceIds,
    sourceIds,
  }

  if (confidence !== undefined) claim.confidence = confidence
  return claim
}

export function uniqueSourceIdsFromClaims(
  claims: Array<{ sourceIds?: string[] }> | undefined,
): string[] {
  const ids: string[] = []
  for (const claim of claims ?? []) {
    for (const id of claim.sourceIds ?? []) {
      if (typeof id === 'string' && id && !ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

export function adaptPaper(
  backendPaper: BackendPaper,
  sessionSources: BackendSessionSource[] = [],
): FinalPaper {
  const claimSourceIds = uniqueSourceIdsFromClaims(backendPaper.claims)
  const sessionById = new Map(sessionSources.map((source) => [source.id, source]))

  let sources: Source[]

  if (sessionSources.length > 0) {
    sources = sessionSources.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      excerpt: source.snippet ?? source.excerpt,
      stance: 'supports' as const,
    }))
  } else {
    const references = backendPaper.references ?? []
    sources = references.map((ref, i) => {
      const id = claimSourceIds[i]
      const session = id ? sessionById.get(id) : undefined
      return {
        id: session?.id ?? id ?? `unresolved_ref_${i}`,
        title: session?.title ?? ref,
        url: session?.url,
        excerpt: session?.snippet ?? session?.excerpt,
        stance: 'supports' as const,
      }
    })

    // Include any claim-linked sources not represented in references
    for (const id of claimSourceIds) {
      if (sources.some((source) => source.id === id)) continue
      const session = sessionById.get(id)
      sources.push({
        id,
        title: session?.title ?? id,
        url: session?.url,
        excerpt: session?.snippet ?? session?.excerpt,
        stance: 'supports',
      })
    }
  }

  const citations: Record<string, string> = {}
  sources.forEach((source, i) => {
    citations[String(i + 1)] = source.id
  })

  return {
    title: backendPaper.title,
    abstract: backendPaper.abstract,
    keyFindings: (backendPaper.findings ?? []).map((f) => `${f.heading}: ${f.content}`),
    sections: [
      { title: 'INTRODUCTION', content: backendPaper.introduction ?? '' },
      ...(backendPaper.findings ?? []).map((f) => ({
        title: f.heading.toUpperCase(),
        content: f.content,
      })),
      { title: 'ANALYSIS', content: backendPaper.analysis ?? '' },
      { title: 'CONCLUSION', content: backendPaper.conclusion ?? '' },
    ],
    citations,
    sources,
    generatedAt: backendPaper.metadata?.generatedAt ?? new Date().toISOString(),
  }
}

export function adaptEvent(be: BackendEvent): ResearchEvent | null {
  const agent = (be.agent ?? 'orchestrator') as AgentId
  const status = mapStatus(be.status)
  const frontendType = mapEventType(be.type)
  const claim = extractClaim(be)

  const event: ResearchEvent = {
    id: be.id,
    ts: be.timestamp,
    type: frontendType,
    agent,
    status,
    message: be.message,
    payload: {
      progress: asFiniteNumber(be.payload?.progress),
      packetType:
        be.type === 'handoff'
          ? (be.agent === 'writer' || be.to === 'writer' ? 'draft' : 'evidence')
          : undefined,
      claim,
    },
  }

  if (be.type === 'handoff' && be.to) {
    event.to = be.to as AgentId
  }

  return event
}
