// ============================================================
// Science Bots — Central Zustand Store
//
// Architecture:
//   EventSource → dispatch(event) → store mutates → scene + UI react
//
// Rules:
//  - The 3D scene and UI read from this store only.
//  - dispatch() is the ONLY mutation entry point.
//  - No component ever calls EventSource directly.
// ============================================================

import { create } from 'zustand'
import type {
  AgentId,
  AgentState,
  AgentStatus,
  AppPhase,
  Claim,
  FinalPaper,
  HandoffPacketState,
  ResearchEvent,
  RouteId,
} from '@/types'
import { AGENT_IDS, getRouteId } from '@/types'
import { computeMissionProgress } from '@/missionProgress'

// ─────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────

const DEFAULT_STATUS_LINES: Record<AgentId, string> = {
  orchestrator: 'STANDING BY',
  researcher: 'STANDING BY',
  analyzer: 'STANDING BY',
  writer: 'STANDING BY',
  reviewer: 'STANDING BY',
}

function makeDefaultAgents(): Record<AgentId, AgentState> {
  return Object.fromEntries(
    AGENT_IDS.map((id) => [
      id,
      {
        id,
        status: 'idle' as AgentStatus,
        statusLine: DEFAULT_STATUS_LINES[id],
        isActive: false,
      } satisfies AgentState,
    ])
  ) as Record<AgentId, AgentState>
}

export interface ScienceBotsStore {
  // ── App state ──────────────────────────────
  phase: AppPhase
  topic: string
  progress: number
  isDemo: boolean

  // ── Agent states ───────────────────────────
  agents: Record<AgentId, AgentState>

  // ── Event log ─────────────────────────────
  events: ResearchEvent[]

  // ── Scene state ────────────────────────────
  /** Currently lit route segments */
  activeRoutes: RouteId[]
  /** In-flight handoff packets */
  handoffs: HandoffPacketState[]

  // ── Claims ────────────────────────────────
  claims: Claim[]
  selectedClaimId: string | null

  // ── Final paper ───────────────────────────
  finalPaper: FinalPaper | null
  showPaperViewer: boolean

  // ── Actions ───────────────────────────────

  /** Set mission topic and transition to loading phase. */
  startMission: (topic: string, demo?: boolean) => void

  /**
   * Single entry point for all incoming events.
   * Mutates agents, routes, handoffs, claims, paper — nothing else should.
   */
  dispatch: (event: ResearchEvent) => void

  /** Mark a route as active (lit). Auto-clears after durationMs. */
  activateRoute: (routeId: RouteId, durationMs?: number) => void

  /** Add a travelling handoff packet. */
  addHandoff: (packet: Omit<HandoffPacketState, 'progress' | 'startedAt'>) => void

  /** Remove a handoff packet by id. */
  removeHandoff: (id: string) => void

  /** Select / deselect a claim to show in the evidence panel. */
  selectClaim: (claimId: string | null) => void

  /** Show / hide the paper viewer. */
  setShowPaperViewer: (show: boolean) => void

  /** Transition to disconnected state. */
  setDisconnected: () => void

  /** Reset the store to initial state (for starting a new mission). */
  reset: () => void
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const MAX_EVENTS = 50
const ROUTE_ACTIVE_MS = 3500

let _handoffSeq = 0
let _routeTimers: ReturnType<typeof setTimeout>[] = []

function clearRouteTimers() {
  for (const timer of _routeTimers) clearTimeout(timer)
  _routeTimers = []
}

function mergeClaim(existing: Claim, incoming: Claim): Claim {
  return {
    ...existing,
    ...incoming,
    text: incoming.text.trim() ? incoming.text : existing.text,
    sourceIds: incoming.sourceIds.length > 0 ? incoming.sourceIds : existing.sourceIds,
    evidenceIds: incoming.evidenceIds.length > 0 ? incoming.evidenceIds : existing.evidenceIds,
    confidence: incoming.confidence ?? existing.confidence,
    conflictingSourceIds: incoming.conflictingSourceIds ?? existing.conflictingSourceIds,
  }
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useScienceBotsStore = create<ScienceBotsStore>((set, get) => ({
  // ── Initial state ─────────────────────────
  phase: 'start',
  topic: '',
  progress: 0,
  isDemo: false,
  agents: makeDefaultAgents(),
  events: [],
  activeRoutes: [],
  handoffs: [],
  claims: [],
  selectedClaimId: null,
  finalPaper: null,
  showPaperViewer: false,

  // ── startMission ──────────────────────────
  startMission: (topic, demo = false) => {
    clearRouteTimers()
    set({
      phase: 'loading',
      topic,
      isDemo: demo,
      progress: 0,
      agents: makeDefaultAgents(),
      events: [],
      activeRoutes: [],
      handoffs: [],
      claims: [],
      selectedClaimId: null,
      finalPaper: null,
      showPaperViewer: false,
    })
  },

  // ── dispatch ──────────────────────────────
  dispatch: (event) => {
    const store = get()
    const phase = store.phase

    // Ignore events after reset or terminal connection failure
    if (phase === 'start' || phase === 'disconnected') return
    if (phase === 'error' && event.type !== 'error') return

    if (event.type === 'error') {
      set({ phase: 'error' })
    } else if (phase === 'loading') {
      set({ phase: 'active' })
    }

    // 1. Append to event log (newest first, cap at MAX_EVENTS)
    set((s) => ({
      events: [event, ...s.events].slice(0, MAX_EVENTS),
    }))

    // 2. Advance progress from workflow milestones (never 100% without paper)
    set((s) => ({
      progress: computeMissionProgress(s.progress, event),
    }))

    // 3. Update agent state
    if (event.agent && event.status) {
      const statusLine = deriveStatusLine(event.agent, event.status, event.message)
      set((s) => ({
        agents: {
          ...s.agents,
          [event.agent]: {
            ...s.agents[event.agent],
            status: event.status!,
            statusLine,
            isActive: event.status !== 'idle',
          },
        },
      }))
    }

    // 4. Handoff — activate route + spawn packet
    if (event.type === 'handoff' && event.to) {
      const routeId = getRouteId(event.agent, event.to)
      if (routeId) {
        store.activateRoute(routeId, ROUTE_ACTIVE_MS)
      }
      store.addHandoff({
        id: `hoff_${++_handoffSeq}`,
        from: event.agent,
        to: event.to,
        packetType: event.payload?.packetType ?? 'evidence',
        durationMs: 2200,
      })

      // Mark target agent as working
      set((s) => ({
        agents: {
          ...s.agents,
          [event.to!]: {
            ...s.agents[event.to!],
            status: 'waiting',
            statusLine: 'RECEIVING',
            isActive: true,
          },
        },
      }))
    }

    // 5. Claim updates
    if (event.payload?.claim) {
      const incoming = event.payload.claim
      set((s) => {
        const exists = s.claims.find((c) => c.id === incoming.id)
        return {
          claims: exists
            ? s.claims.map((c) => (c.id === incoming.id ? mergeClaim(c, incoming) : c))
            : [...s.claims, incoming],
        }
      })
    }

    // 6. Conflict — visually flag
    if (event.type === 'conflict_detected') {
      // The claim update above handles the status; orchestrator reacts via next events
    }

    // 7. Final paper
    if (event.type === 'paper_final' && event.payload?.paper) {
      set({ finalPaper: event.payload.paper, phase: 'completed', progress: 100 })
    }

    // 8. Error
    if (event.type === 'error') {
      set({ phase: 'error' })
    }
  },

  // ── activateRoute ─────────────────────────
  activateRoute: (routeId, durationMs = ROUTE_ACTIVE_MS) => {
    set((s) => ({
      activeRoutes: s.activeRoutes.includes(routeId)
        ? s.activeRoutes
        : [...s.activeRoutes, routeId],
    }))
    const timer = setTimeout(() => {
      _routeTimers = _routeTimers.filter((t) => t !== timer)
      set((s) => ({
        activeRoutes: s.activeRoutes.filter((r) => r !== routeId),
      }))
    }, durationMs)
    _routeTimers.push(timer)
  },

  // ── addHandoff ────────────────────────────
  addHandoff: (packet) => {
    const full: HandoffPacketState = {
      ...packet,
      progress: 0,
      startedAt: performance.now(),
    }
    set((s) => ({ handoffs: [...s.handoffs, full] }))
  },

  // ── removeHandoff ─────────────────────────
  removeHandoff: (id) => {
    set((s) => ({ handoffs: s.handoffs.filter((h) => h.id !== id) }))
  },

  // ── selectClaim ───────────────────────────
  selectClaim: (claimId) => set({ selectedClaimId: claimId }),

  // ── setShowPaperViewer ────────────────────
  setShowPaperViewer: (show) => set({ showPaperViewer: show }),

  // ── setDisconnected ───────────────────────
  setDisconnected: () => {
    const phase = get().phase
    if (phase === 'completed' || phase === 'start') return
    set({ phase: 'disconnected' })
  },

  // ── reset ─────────────────────────────────
  reset: () => {
    clearRouteTimers()
    set({
      phase: 'start',
      topic: '',
      progress: 0,
      isDemo: false,
      agents: makeDefaultAgents(),
      events: [],
      activeRoutes: [],
      handoffs: [],
      claims: [],
      selectedClaimId: null,
      finalPaper: null,
      showPaperViewer: false,
    })
  },
}))

// ─────────────────────────────────────────────
// Derive a readable status line from agent + status + message
// ─────────────────────────────────────────────

function deriveStatusLine(agent: AgentId, status: AgentStatus, message: string): string {
  // Use message if it's short enough; otherwise use a canonical status phrase
  if (message && message.length <= 38) return message.toUpperCase()

  const map: Record<AgentId, Record<AgentStatus, string>> = {
    orchestrator: {
      idle: 'STANDING BY',
      working: 'DECIDING NEXT STEP',
      tool_calling: 'ROUTING TASK',
      waiting: 'WAITING',
      verifying: 'VERIFYING',
      needs_research: 'NEEDS RESEARCH',
      completed: 'MISSION COMPLETE',
      error: 'ERROR',
    },
    researcher: {
      idle: 'STANDING BY',
      working: 'SEARCHING SOURCES',
      tool_calling: 'QUERYING INDEX',
      waiting: 'RECEIVING TASK',
      verifying: 'CHECKING SOURCES',
      needs_research: 'RE-SEARCHING',
      completed: 'RESEARCH COMPLETE',
      error: 'ERROR',
    },
    analyzer: {
      idle: 'STANDING BY',
      working: 'EVALUATING EVIDENCE',
      tool_calling: 'RUNNING ANALYSIS',
      waiting: 'RECEIVING EVIDENCE',
      verifying: 'VERIFYING CLAIMS',
      needs_research: 'AWAITING EVIDENCE',
      completed: 'ANALYSIS COMPLETE',
      error: 'ERROR',
    },
    writer: {
      idle: 'STANDING BY',
      working: 'DRAFTING PAPER',
      tool_calling: 'WRITING SECTION',
      waiting: 'RECEIVING ANALYSIS',
      verifying: 'CHECKING DRAFT',
      needs_research: 'AWAITING REVISION',
      completed: 'PAPER WRITTEN',
      error: 'ERROR',
    },
    reviewer: {
      idle: 'STANDING BY',
      working: 'REVIEWING CLAIMS',
      tool_calling: 'CHECKING CITATIONS',
      waiting: 'RECEIVING DRAFT',
      verifying: 'VERIFYING SOURCES',
      needs_research: 'CONFLICT DETECTED',
      completed: 'APPROVED',
      error: 'ERROR',
    },
  }

  return map[agent]?.[status] ?? status.toUpperCase()
}
