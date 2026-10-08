// ============================================================
// BackendEventSource
//
// Bridges the real Science Bots backend to the frontend event
// contract. Handles:
//   1. POST /api/research  → obtain researchId
//   2. GET  /api/research/:id/events  → SSE stream
//   3. Event schema translation (backend → frontend types)
//   4. GET  /api/research/:id/paper  → synthesise paper_final
//
// Drop-in replacement for MockEventSource.
// Zero coupling to any store or component.
// ============================================================

import type { IEventSource, EventCallback, DisconnectCallback, ErrorCallback } from './IEventSource'
import type { ResearchEvent, AgentId, AgentStatus, FinalPaper, Claim } from '@/types'

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') as string

// ─────────────────────────────────────────────
// Backend event type → frontend EventType mapping
// ─────────────────────────────────────────────

type BackendEventType =
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

// Maps backend event types to frontend EventType
function mapEventType(backendType: BackendEventType): ResearchEvent['type'] {
  switch (backendType) {
    case 'agent_update':          return 'agent_status'
    case 'source_found':          return 'evidence_found'
    case 'paper_updated':         return 'draft_updated'
    case 'paper_completed':       return 'paper_final' // temporarily; we replace payload below
    case 'insufficient_evidence': return 'conflict_detected'
    case 'revision_required':     return 'conflict_detected'
    case 'conflict_detected':     return 'conflict_detected'
    case 'claim_verified':        return 'claim_verified'
    case 'handoff':               return 'handoff'
    case 'research_started':      return 'agent_status'
    case 'error':                 return 'error'
    default:                      return 'agent_status'
  }
}

// Maps backend agent status to frontend AgentStatus
function mapStatus(backendStatus: string | null): AgentStatus | undefined {
  if (!backendStatus) return undefined
  const valid: AgentStatus[] = [
    'idle', 'working', 'tool_calling', 'waiting',
    'verifying', 'needs_research', 'completed', 'error',
  ]
  return valid.includes(backendStatus as AgentStatus)
    ? (backendStatus as AgentStatus)
    : 'working'
}

// ─────────────────────────────────────────────
// Backend paper → FinalPaper
// ─────────────────────────────────────────────

interface BackendPaper {
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

function adaptPaper(backendPaper: BackendPaper): FinalPaper {
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
    citations: {},
    sources: (backendPaper.references ?? []).map((ref, i) => ({
      id: `ref_${i}`,
      title: ref,
      url: undefined,
      excerpt: undefined,
      stance: 'supports' as const,
    })),
    generatedAt: backendPaper.metadata?.generatedAt ?? new Date().toISOString(),
  }
}

// ─────────────────────────────────────────────
// Backend event → ResearchEvent (frontend shape)
// ─────────────────────────────────────────────

interface BackendEvent {
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

function adaptEvent(be: BackendEvent): ResearchEvent | null {
  const agent = (be.agent ?? 'orchestrator') as AgentId
  const status = mapStatus(be.status)
  const frontendType = mapEventType(be.type)

  // Build claim if present in payload
  let claim: Claim | undefined
  if (be.payload?.claimId) {
    claim = {
      id: be.payload.claimId as string,
      text: (be.payload.text as string) ?? be.message,
      verificationStatus:
        be.type === 'claim_verified'
          ? 'supported'
          : be.type === 'conflict_detected'
          ? 'conflict'
          : 'pending',
      evidenceIds: [],
      sourceIds: (be.payload.sourceIds as string[]) ?? [],
    }
  }

  const event: ResearchEvent = {
    id: be.id,
    ts: be.timestamp,
    type: frontendType,
    agent,
    status,
    message: be.message,
    payload: {
      progress: be.payload?.progress as number | undefined,
      packetType:
        be.type === 'handoff'
          ? be.type === 'handoff' && (be.agent === 'writer' || be.to === 'writer')
            ? 'draft'
            : 'evidence'
          : undefined,
      claim,
    },
  }

  // Attach `to` for handoff events
  if (be.type === 'handoff' && be.to) {
    event.to = be.to as AgentId
  }

  return event
}

// ─────────────────────────────────────────────
// BackendEventSource
// ─────────────────────────────────────────────

export class BackendEventSource implements IEventSource {
  private _es: EventSource | null = null
  private _running = false
  private _topic: string
  private _researchId: string | null = null

  constructor(topic: string) {
    this._topic = topic
  }

  get isRunning(): boolean {
    return this._running
  }

  get researchId(): string | null {
    return this._researchId
  }

  subscribe(
    onEvent: EventCallback,
    onDisconnect?: DisconnectCallback,
    onError?: ErrorCallback
  ): () => void {
    if (this._running) this.stop()

    this._startSession(onEvent, onDisconnect, onError)

    return () => this.stop()
  }

  private async _startSession(
    onEvent: EventCallback,
    onDisconnect?: DisconnectCallback,
    onError?: ErrorCallback
  ) {
    // Step 1: POST /api/research
    let researchId: string
    try {
      const res = await fetch(`${API_BASE}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: this._topic }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`POST /api/research failed: HTTP ${res.status} — ${body}`)
      }

      const data = await res.json() as { success: boolean; researchId: string }
      if (!data.success || !data.researchId) {
        throw new Error('POST /api/research: unexpected response shape')
      }
      researchId = data.researchId
      this._researchId = researchId
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to start research session'))
      return
    }

    // Step 2: Open SSE stream
    try {
      const sseUrl = `${API_BASE}/api/research/${researchId}/events`
      this._es = new EventSource(sseUrl)
      this._running = true

      // Generic message handler (catch-all)
      this._es.onmessage = (e: MessageEvent) => {
        this._handleRawEvent(e.data as string, researchId, onEvent)
      }

      // Named event listeners for every backend type
      const types: BackendEventType[] = [
        'research_started', 'agent_update', 'handoff', 'source_found',
        'claim_verified', 'insufficient_evidence', 'conflict_detected',
        'revision_required', 'paper_updated', 'paper_completed', 'error',
      ]

      for (const t of types) {
        this._es.addEventListener(t, (e: Event) => {
          this._handleRawEvent((e as MessageEvent).data as string, researchId, onEvent, t)
        })
      }

      this._es.onerror = () => {
        this._running = false
        onDisconnect?.()
        onError?.(new Error('SSE connection lost'))
        this._es?.close()
        this._es = null
      }
    } catch (err) {
      this._running = false
      onError?.(err instanceof Error ? err : new Error('Failed to open SSE stream'))
    }
  }

  private async _handleRawEvent(
    data: string,
    researchId: string,
    onEvent: EventCallback,
    knownType?: BackendEventType
  ) {
    let be: BackendEvent
    try {
      be = JSON.parse(data) as BackendEvent
      // If the SSE named event tells us the type, trust it
      if (knownType && !be.type) be.type = knownType
      if (knownType && be.type !== knownType) be.type = knownType
    } catch {
      return
    }

    // On paper_completed: fetch the paper and emit a paper_final event
    if (be.type === 'paper_completed') {
      try {
        const paperRes = await fetch(`${API_BASE}/api/research/${researchId}/paper`)
        if (paperRes.ok) {
          const paperData = await paperRes.json() as { success: boolean; paper: BackendPaper }
          if (paperData.success && paperData.paper) {
            const finalPaper = adaptPaper(paperData.paper)
            const finalEvent: ResearchEvent = {
              id: be.id,
              ts: be.timestamp,
              type: 'paper_final',
              agent: (be.agent ?? 'reviewer') as AgentId,
              status: 'completed',
              message: be.message,
              payload: {
                paper: finalPaper,
                progress: 100,
              },
            }
            onEvent(finalEvent)
            return
          }
        }
      } catch {
        // Fallback: emit a basic paper_final without paper data
      }

      // Fallback if paper fetch fails
      const ev = adaptEvent(be)
      if (ev) onEvent(ev)
      return
    }

    const adapted = adaptEvent(be)
    if (adapted) onEvent(adapted)
  }

  stop(): void {
    this._running = false
    this._es?.close()
    this._es = null
  }
}
