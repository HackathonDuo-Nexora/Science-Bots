// ============================================================
// MockEventSource
// Plays a scripted WOW sequence that demonstrates:
//  - Multi-agent collaboration
//  - Conflict detection + Orchestrator reaction
//  - Researcher loop-back
//  - Final paper emergence
//
// ISOLATED: zero coupling to the store or components.
// When the real backend is ready, swap this for LiveEventSource.
// ============================================================

import type { IEventSource, EventCallback, DisconnectCallback, ErrorCallback } from './IEventSource'
import type {
  ResearchEvent,
  AgentId,
  AgentStatus,
  EventType,
  HandoffPacketType,
  Claim,
  FinalPaper,
} from '@/types'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

let _seq = 0
function evtId() {
  return `evt_mock_${++_seq}`
}

function ts(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString()
}

function agentStatus(
  agent: AgentId,
  status: AgentStatus,
  message: string,
  progress?: number,
  extra?: Partial<ResearchEvent>
): ResearchEvent {
  return {
    id: evtId(),
    ts: ts(),
    type: 'agent_status',
    agent,
    status,
    message,
    payload: { progress },
    ...extra,
  }
}

function handoff(
  from: AgentId,
  to: AgentId,
  packetType: HandoffPacketType,
  message: string,
  progress?: number
): ResearchEvent {
  return {
    id: evtId(),
    ts: ts(),
    type: 'handoff',
    agent: from,
    to,
    status: 'working',
    message,
    payload: { packetType, progress },
  }
}

// ─────────────────────────────────────────────
// Demo claim & paper data
// ─────────────────────────────────────────────

const DEMO_CLAIM: Claim = {
  id: 'claim_1',
  text: 'AI-assisted diagnosis can improve diagnostic performance by up to 30% in radiology workflows.',
  verificationStatus: 'pending',
  evidenceIds: ['ev_1', 'ev_2'],
  sourceIds: ['src_1', 'src_2'],
}

const DEMO_CLAIM_CONFLICT: Claim = {
  ...DEMO_CLAIM,
  verificationStatus: 'conflict',
  conflictingSourceIds: ['src_2'],
}

const DEMO_CLAIM_SUPPORTED: Claim = {
  ...DEMO_CLAIM,
  verificationStatus: 'supported',
  evidenceIds: ['ev_1', 'ev_2', 'ev_3'],
  sourceIds: ['src_1', 'src_2', 'src_3'],
}

const DEMO_PAPER: FinalPaper = {
  title: 'The Impact of AI on Healthcare Diagnostics',
  abstract:
    'This paper examines the transformative role of artificial intelligence in modern healthcare diagnostics. Through analysis of peer-reviewed literature and clinical trial data, we identify key areas where AI substantially improves diagnostic accuracy, workflow efficiency, and patient outcomes.',
  keyFindings: [
    'AI-assisted radiology reduces diagnostic errors by an average of 28% across surveyed studies.',
    'Natural language processing tools accelerate clinical documentation by 40%, freeing physician time.',
    'Conflict in early-stage AI adoption data resolved upon inclusion of post-2022 prospective trials.',
    'Ethical and regulatory frameworks remain the primary bottleneck for widespread AI deployment.',
  ],
  sections: [
    {
      title: '1. Introduction',
      content:
        'Artificial intelligence (AI) has emerged as a disruptive force in healthcare, particularly in the domain of diagnostics. From image recognition in radiology [1] to predictive analytics in pathology [2], AI systems are demonstrating performance that, in controlled conditions, approaches or exceeds that of experienced clinicians.',
    },
    {
      title: '2. AI in Radiology',
      content:
        'Convolutional neural networks (CNNs) trained on large annotated imaging datasets have produced diagnostic accuracy rates comparable to board-certified radiologists for conditions including pulmonary nodule detection and diabetic retinopathy screening [1][3]. A 2023 meta-analysis found a pooled sensitivity improvement of 28% when AI was used as a second reader.',
    },
    {
      title: '3. Conflict Analysis',
      content:
        'Initial evidence from 2019–2021 presented conflicting accuracy metrics for AI-assisted diagnosis in emergency settings [2]. Upon extended research and inclusion of prospective 2022–2024 trial data, this conflict was resolved. The discrepancy was attributed to dataset heterogeneity and differing evaluation protocols rather than fundamental capability limitations.',
    },
    {
      title: '4. Limitations',
      content:
        'Generalisation remains a challenge. Models trained on population-specific datasets may underperform on underrepresented groups. Regulatory approval pathways for AI diagnostic tools are inconsistent across jurisdictions, creating deployment uncertainty.',
    },
    {
      title: '5. Conclusion',
      content:
        'AI represents a genuine step-change in diagnostic medicine. With appropriate governance and equitable dataset curation, widespread deployment has the potential to reduce diagnostic error rates materially and improve population health outcomes.',
    },
  ],
  citations: {
    '1': 'src_1',
    '2': 'src_2',
    '3': 'src_3',
  },
  sources: [
    {
      id: 'src_1',
      title: 'Deep Learning for Radiology: A Meta-Analysis (2023)',
      url: 'https://example.com/src1',
      excerpt: 'AI second-reader systems improved sensitivity by 28% across 14 trials.',
      stance: 'supports',
    },
    {
      id: 'src_2',
      title: 'AI Diagnostic Performance in Emergency Settings (2021)',
      url: 'https://example.com/src2',
      excerpt: 'Results were mixed; accuracy varied significantly by institution and dataset.',
      stance: 'contradicts',
    },
    {
      id: 'src_3',
      title: 'Prospective Evaluation of AI in Clinical Workflows (2024)',
      url: 'https://example.com/src3',
      excerpt: 'Post-deployment accuracy stabilised at 91.4% sensitivity across three sites.',
      stance: 'supports',
    },
  ],
  generatedAt: new Date().toISOString(),
}

// ─────────────────────────────────────────────
// Scripted timeline
// Each entry: delay from mission start (ms) + event factory
// ─────────────────────────────────────────────

type ScriptEntry = {
  delayMs: number
  build: () => ResearchEvent
}

function buildScript(topic: string): ScriptEntry[] {
  void topic // topic available for future personalisation
  return [
    // ── PHASE 1: Mission start ──────────────────────────
    {
      delayMs: 500,
      build: () => agentStatus('orchestrator', 'working', 'Analysing research topic', 5),
    },
    {
      delayMs: 1800,
      build: () => agentStatus('orchestrator', 'tool_calling', 'Assigning research task', 8),
    },
    {
      delayMs: 3000,
      build: () =>
        handoff('orchestrator', 'researcher', 'evidence', 'Sending research task to Researcher', 10),
    },

    // ── PHASE 2: Research ───────────────────────────────
    {
      delayMs: 3500,
      build: () => agentStatus('researcher', 'working', 'Searching academic sources', 12),
    },
    {
      delayMs: 5500,
      build: () => agentStatus('researcher', 'tool_calling', 'Querying search index', 16),
    },
    {
      delayMs: 8000,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'evidence_found' as EventType,
        agent: 'researcher' as AgentId,
        status: 'working' as AgentStatus,
        message: 'Found 3 academic sources',
        payload: { evidenceIds: ['ev_1', 'ev_2'], sourceIds: ['src_1', 'src_2'], progress: 22 },
      }),
    },
    {
      delayMs: 9500,
      build: () =>
        handoff('researcher', 'analyzer', 'evidence', 'Sending evidence to Analyzer', 25),
    },

    // ── PHASE 3: Analysis ───────────────────────────────
    {
      delayMs: 10000,
      build: () => agentStatus('analyzer', 'working', 'Evaluating evidence quality', 28),
    },
    {
      delayMs: 12000,
      build: () => agentStatus('analyzer', 'verifying', 'Cross-referencing sources', 32),
    },
    {
      delayMs: 14500,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'claim_verified' as EventType,
        agent: 'analyzer' as AgentId,
        status: 'working' as AgentStatus,
        message: 'Evidence evaluated — forwarding to Writer',
        payload: { claim: DEMO_CLAIM, progress: 36 },
      }),
    },
    {
      delayMs: 15500,
      build: () => handoff('analyzer', 'writer', 'draft', 'Forwarding analysis to Writer', 38),
    },

    // ── PHASE 4: Writing ────────────────────────────────
    {
      delayMs: 16000,
      build: () => agentStatus('writer', 'working', 'Drafting research paper', 42),
    },
    {
      delayMs: 19000,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'draft_updated' as EventType,
        agent: 'writer' as AgentId,
        status: 'working' as AgentStatus,
        message: 'Initial draft complete',
        payload: { progress: 48 },
      }),
    },
    {
      delayMs: 20000,
      build: () => handoff('writer', 'reviewer', 'draft', 'Sending draft to Reviewer', 50),
    },

    // ── PHASE 5: Review → CONFLICT ──────────────────────
    {
      delayMs: 20500,
      build: () => agentStatus('reviewer', 'working', 'Reviewing claims and citations', 52),
    },
    {
      delayMs: 23000,
      build: () => agentStatus('reviewer', 'verifying', 'Checking source consistency', 54),
    },
    {
      delayMs: 25000,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'conflict_detected' as EventType,
        agent: 'reviewer' as AgentId,
        status: 'needs_research' as AgentStatus,
        message: 'Conflict detected — sources disagree on diagnostic accuracy',
        payload: { claim: DEMO_CLAIM_CONFLICT, progress: 56 },
      }),
    },

    // ── PHASE 6: Orchestrator reacts ────────────────────
    {
      delayMs: 26500,
      build: () => agentStatus('orchestrator', 'working', 'Conflict received — re-routing', 58),
    },
    {
      delayMs: 28000,
      build: () =>
        handoff('orchestrator', 'researcher', 'conflict', 'Requesting additional research', 60),
    },

    // ── PHASE 7: Researcher loop-back ───────────────────
    {
      delayMs: 28500,
      build: () => agentStatus('researcher', 'working', 'Searching for additional evidence', 62),
    },
    {
      delayMs: 31000,
      build: () => agentStatus('researcher', 'tool_calling', 'Querying extended source index', 64),
    },
    {
      delayMs: 33500,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'evidence_found' as EventType,
        agent: 'researcher' as AgentId,
        status: 'working' as AgentStatus,
        message: 'New prospective trial data found (2024)',
        payload: { evidenceIds: ['ev_3'], sourceIds: ['src_3'], progress: 67 },
      }),
    },
    {
      delayMs: 35000,
      build: () =>
        handoff('researcher', 'analyzer', 'evidence', 'New evidence to Analyzer', 70),
    },

    // ── PHASE 8: Re-analysis ────────────────────────────
    {
      delayMs: 35500,
      build: () => agentStatus('analyzer', 'verifying', 'Re-verifying with new evidence', 72),
    },
    {
      delayMs: 38000,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'claim_verified' as EventType,
        agent: 'analyzer' as AgentId,
        status: 'completed' as AgentStatus,
        message: 'Claim verified — conflict resolved',
        payload: { claim: DEMO_CLAIM_SUPPORTED, progress: 76 },
      }),
    },
    {
      delayMs: 39000,
      build: () => handoff('analyzer', 'writer', 'draft', 'Verified analysis to Writer', 78),
    },

    // ── PHASE 9: Revision ───────────────────────────────
    {
      delayMs: 39500,
      build: () => agentStatus('writer', 'working', 'Revising paper with new evidence', 80),
    },
    {
      delayMs: 42000,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'draft_updated' as EventType,
        agent: 'writer' as AgentId,
        status: 'completed' as AgentStatus,
        message: 'Revised draft complete',
        payload: { progress: 85 },
      }),
    },
    {
      delayMs: 43000,
      build: () =>
        handoff('writer', 'reviewer', 'draft', 'Revised draft to Reviewer', 86),
    },

    // ── PHASE 10: Final review → Approve ────────────────
    {
      delayMs: 43500,
      build: () => agentStatus('reviewer', 'verifying', 'Final review in progress', 88),
    },
    {
      delayMs: 46000,
      build: () => agentStatus('reviewer', 'completed', 'All claims verified — approved', 92),
    },

    // ── PHASE 11: Orchestrator wraps up ─────────────────
    {
      delayMs: 47000,
      build: () =>
        agentStatus('orchestrator', 'working', 'Compiling final research paper', 95),
    },

    // ── PHASE 12: Final paper ───────────────────────────
    {
      delayMs: 49000,
      build: () => ({
        id: evtId(),
        ts: ts(),
        type: 'paper_final' as EventType,
        agent: 'orchestrator' as AgentId,
        status: 'completed' as AgentStatus,
        message: 'Research complete — final paper ready',
        payload: { paper: DEMO_PAPER, progress: 100 },
      }),
    },

    // ── Settle all agents ───────────────────────────────
    {
      delayMs: 50000,
      build: () => agentStatus('researcher', 'completed', 'Research complete', 100),
    },
    {
      delayMs: 50200,
      build: () => agentStatus('analyzer', 'completed', 'Analysis complete', 100),
    },
    {
      delayMs: 50400,
      build: () => agentStatus('writer', 'completed', 'Paper written', 100),
    },
  ]
}

// ─────────────────────────────────────────────
// MockEventSource implementation
// ─────────────────────────────────────────────

export class MockEventSource implements IEventSource {
  private _running = false
  private _timers: ReturnType<typeof setTimeout>[] = []
  private _callback: EventCallback | null = null
  private _topic = 'Unknown Topic'

  get isRunning(): boolean {
    return this._running
  }

  /** Call this before subscribe() to set the mission topic. */
  setTopic(topic: string): void {
    this._topic = topic
  }

  subscribe(
    onEvent: EventCallback,
    _onDisconnect?: DisconnectCallback,
    _onError?: ErrorCallback
  ): () => void {
    this._callback = onEvent
    this._running = true
    this._timers = []

    const script = buildScript(this._topic)

    for (const entry of script) {
      const timer = setTimeout(() => {
        if (this._running && this._callback) {
          this._callback(entry.build())
        }
      }, entry.delayMs)
      this._timers.push(timer)
    }

    return () => this.stop()
  }

  stop(): void {
    this._running = false
    for (const t of this._timers) clearTimeout(t)
    this._timers = []
    this._callback = null
  }
}
