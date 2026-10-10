/**
 * Lightweight adapter/progress checks. Run with:
 *   npx tsx src/events/adaptBackendEvent.verify.ts
 */
import {
  adaptEvent,
  adaptPaper,
  extractClaim,
  mapEventType,
  type BackendEvent,
  type BackendPaper,
} from './adaptBackendEvent'
import { computeMissionProgress, PRE_PAPER_PROGRESS_CAP } from '../missionProgress'
import { useScienceBotsStore } from '../store/useScienceBotsStore'
import type { ResearchEvent } from '../types'

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message)
}

function backendEvent(partial: Partial<BackendEvent> & Pick<BackendEvent, 'type' | 'message'>): BackendEvent {
  return {
    id: partial.id ?? 'evt_1',
    timestamp: partial.timestamp ?? '2026-10-10T00:00:00.000Z',
    type: partial.type,
    agent: partial.agent ?? 'analyzer',
    status: partial.status ?? 'verifying',
    action: partial.action ?? null,
    message: partial.message,
    to: partial.to ?? null,
    payload: partial.payload ?? {},
  }
}

function run() {
  // claimId form (real mode)
  const byClaimId = extractClaim(backendEvent({
    type: 'claim_verified',
    message: 'Claim verified',
    payload: {
      claimId: 'clm_abc',
      text: 'Photosynthesis produces oxygen.',
      status: 'supported',
      confidence: 0.82,
      sourceIds: ['src_1'],
    },
  }))
  assert(byClaimId?.id === 'clm_abc', 'claimId should be used')
  assert(byClaimId?.text === 'Photosynthesis produces oxygen.', 'claim text preserved')
  assert(byClaimId?.verificationStatus === 'supported', 'supported status')
  assert(byClaimId?.confidence === 0.82, 'confidence preserved')
  assert(byClaimId?.sourceIds[0] === 'src_1', 'sourceIds preserved')

  // id form (demo CLAIM_VERIFIED)
  const byId = extractClaim(backendEvent({
    type: 'claim_verified',
    message: 'Claim verified: "demo…"',
    payload: {
      id: 'clm_demo',
      text: '[DEMO] Primary domain impact.',
      status: 'supported',
      sourceIds: ['src_demo_1'],
    },
  }))
  assert(byId?.id === 'clm_demo', 'payload.id should be used')
  assert(byId?.text.startsWith('[DEMO]'), 'demo text preserved')

  // duplicate id is the same identifier (store merges; adapter returns same id)
  assert(extractClaim(backendEvent({
    type: 'claim_verified',
    message: 'again',
    payload: { id: 'clm_demo', text: '[DEMO] Primary domain impact.' },
  }))?.id === 'clm_demo', 'same claim id on update')

  // insufficient_evidence demo payload.claim is a string — not a claim
  const insufficient = adaptEvent(backendEvent({
    type: 'insufficient_evidence',
    message: 'Additional evidence is required for one key claim.',
    payload: { claim: 'Research gap analysis (Finding 3) requires a stronger supporting source.' },
  }))
  assert(insufficient?.type === 'insufficient_evidence', 'insufficient_evidence stays distinct')
  assert(!insufficient?.payload?.claim, 'must not fabricate a claim from a string payload.claim')

  const revision = adaptEvent(backendEvent({
    type: 'revision_required',
    agent: 'reviewer',
    message: 'One claim requires clearer supporting evidence.',
    payload: { issue: 'Finding 3', severity: 'minor' },
  }))
  assert(revision?.type === 'revision_required', 'revision_required stays distinct')
  assert(mapEventType('conflict_detected') === 'conflict_detected', 'true conflicts still map')

  // paper sources keep backend ids
  const paper: BackendPaper = {
    title: 'T',
    abstract: 'A',
    introduction: 'I',
    findings: [],
    analysis: 'N',
    conclusion: 'C',
    references: ['[DEMO Ref 1] Demo, A. (2024). "Src". Demo Source.'],
    claims: [{ id: 'clm_demo', text: 't', status: 'supported', sourceIds: ['src_aaa'] }],
    metadata: { generatedAt: '2026-10-10T00:00:00.000Z', demo: true, sourceCount: 1, topic: 't' },
  }
  const adapted = adaptPaper(paper, [{
    id: 'src_aaa',
    title: '[DEMO] Systematic Review',
    url: 'https://demo.example.com/source-1',
    snippet: 'excerpt',
  }])
  assert(adapted.sources[0].id === 'src_aaa', 'original source id preserved')
  assert(adapted.sources[0].url === 'https://demo.example.com/source-1', 'url preserved')
  assert(adapted.sources[0].title === '[DEMO] Systematic Review', 'title preserved')
  assert(!adapted.sources.some((s) => s.id.startsWith('ref_')), 'must not invent ref_N ids when session sources exist')

  const fromClaimsOnly = adaptPaper(paper, [])
  assert(fromClaimsOnly.sources[0].id === 'src_aaa', 'claim sourceIds used when session sources missing')

  // progress
  let progress = 0
  progress = computeMissionProgress(progress, { id: '1', ts: '', type: 'agent_status', agent: 'orchestrator', message: 'planning' })
  assert(progress > 0 && progress < 100, 'progress advances above 0 before completion')
  progress = computeMissionProgress(progress, { id: '2', ts: '', type: 'evidence_found', agent: 'researcher', message: 'src' })
  const mid = progress
  progress = computeMissionProgress(progress, { id: '3', ts: '', type: 'claim_verified', agent: 'analyzer', message: 'ok' })
  assert(progress > mid, 'progress advances through intermediate milestones')
  progress = computeMissionProgress(progress, { id: '4', ts: '', type: 'draft_updated', agent: 'writer', message: 'draft' })
  assert(progress < 100, 'draft must not reach 100')
  const fakeComplete = computeMissionProgress(progress, {
    id: '5', ts: '', type: 'paper_final', agent: 'reviewer', message: 'done', payload: { progress: 100 },
  })
  assert(fakeComplete === PRE_PAPER_PROGRESS_CAP, '100 without paper is capped')
  const realComplete = computeMissionProgress(progress, {
    id: '6', ts: '', type: 'paper_final', agent: 'reviewer', message: 'done',
    payload: { paper: adapted },
  })
  assert(realComplete === 100, '100 only with retrieved paper')

  // store: claims upsert, progress, reset isolation
  const store = useScienceBotsStore.getState()
  store.reset()
  store.startMission('fusion energy')
  assert(useScienceBotsStore.getState().phase === 'loading', 'startMission stays loading until events')
  assert(useScienceBotsStore.getState().progress === 0, 'progress resets on start')

  const evt = (partial: Partial<ResearchEvent> & Pick<ResearchEvent, 'type' | 'message'>): ResearchEvent => ({
    id: partial.id ?? `e_${Math.random()}`,
    ts: '2026-10-10T00:00:00.000Z',
    agent: partial.agent ?? 'analyzer',
    ...partial,
  })

  store.dispatch(evt({
    type: 'claim_verified',
    message: 'verified',
    payload: {
      claim: {
        id: 'clm_demo',
        text: '[DEMO] Primary domain impact.',
        verificationStatus: 'supported',
        evidenceIds: [],
        sourceIds: ['src_aaa'],
        confidence: 0.9,
      },
    },
  }))
  assert(useScienceBotsStore.getState().phase === 'active', 'first event moves loading → active')
  assert(useScienceBotsStore.getState().claims.length === 1, 'claim inserted')
  store.dispatch(evt({
    type: 'claim_verified',
    message: 'verified again',
    payload: {
      claim: {
        id: 'clm_demo',
        text: '',
        verificationStatus: 'supported',
        evidenceIds: [],
        sourceIds: [],
      },
    },
  }))
  assert(useScienceBotsStore.getState().claims.length === 1, 'same id must not duplicate')
  assert(useScienceBotsStore.getState().claims[0].text === '[DEMO] Primary domain impact.', 'empty update keeps text')
  assert(useScienceBotsStore.getState().progress > 0, 'progress advanced during session')

  store.dispatch(evt({ type: 'insufficient_evidence', message: 'need more sources' }))
  store.dispatch(evt({ type: 'revision_required', message: 'please revise finding 3' }))
  assert(
    useScienceBotsStore.getState().events.some((e) => e.type === 'insufficient_evidence'),
    'insufficient_evidence stored as itself',
  )
  assert(
    useScienceBotsStore.getState().events.some((e) => e.type === 'revision_required'),
    'revision_required stored as itself',
  )
  assert(
    !useScienceBotsStore.getState().events.some((e) => e.type === 'conflict_detected'),
    'feedback events must not become conflicts',
  )

  store.reset()
  assert(useScienceBotsStore.getState().progress === 0, 'reset returns progress to 0')
  assert(useScienceBotsStore.getState().phase === 'start', 'reset returns to start')
  store.dispatch(evt({
    type: 'agent_status',
    agent: 'orchestrator',
    status: 'working',
    message: 'stale event from old SSE',
  }))
  assert(useScienceBotsStore.getState().events.length === 0, 'old events must not update after reset')
  assert(useScienceBotsStore.getState().phase === 'start', 'stale events must not leave start')

  console.log('adaptBackendEvent.verify: all checks passed')
}

run()
