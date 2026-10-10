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
import type { ResearchEvent, AgentId, FinalPaper } from '@/types'
import {
  adaptEvent,
  adaptPaper,
  BACKEND_EVENT_TYPES,
  type BackendEvent,
  type BackendEventType,
  type BackendPaper,
  type BackendSessionSource,
} from './adaptBackendEvent'

const rawBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') as string
const API_BASE = rawBase.trim().replace(/\/+$/, '').replace(/\/api$/, '')

export class BackendEventSource implements IEventSource {
  private _es: EventSource | null = null
  private _running = false
  private _completed = false
  private _hasError = false
  private _topic: string
  private _researchId: string | null = null
  /** Bumped on every stop() so in-flight POST/SSE/paper work is ignored. */
  private _generation = 0

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
    this.stop()
    const generation = this._generation
    void this._startSession(generation, onEvent, onDisconnect, onError)
    return () => this.stop()
  }

  private async _startSession(
    generation: number,
    onEvent: EventCallback,
    onDisconnect?: DisconnectCallback,
    onError?: ErrorCallback
  ) {
    let researchId: string | null = null
    let lastErr: Error | null = null

    // ── Start research with retry for Render cold boot (502/503/timeout) ───────
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (this._generation !== generation) return
      try {
        const res = await fetch(`${API_BASE}/api/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: this._topic }),
        })

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < 3) {
            console.warn(`[BackendEventSource] Server returned HTTP ${res.status} (attempt ${attempt}). Retrying in 2.5s...`)
            await new Promise((r) => setTimeout(r, 2500))
            continue
          }
          throw new Error(`POST /api/research failed: HTTP ${res.status} — ${body}`)
        }

        const data = await res.json() as { success: boolean; researchId: string }
        if (!data.success || !data.researchId) {
          throw new Error('POST /api/research: unexpected response shape')
        }
        researchId = data.researchId
        break
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
        if (attempt < 3 && this._generation === generation) {
          console.warn(`[BackendEventSource] Connection attempt ${attempt} failed: ${lastErr.message}. Retrying in 2.5s...`)
          await new Promise((r) => setTimeout(r, 2500))
          continue
        }
      }
    }

    if (!researchId) {
      if (this._generation !== generation) return
      onError?.(lastErr ?? new Error('Failed to start research session'))
      return
    }

    if (this._generation !== generation) return

    this._researchId = researchId

    try {
      const sseUrl = `${API_BASE}/api/research/${researchId}/events`
      this._es = new EventSource(sseUrl)
      this._running = true

      this._es.onmessage = (e: MessageEvent) => {
        void this._handleRawEvent(generation, e.data as string, researchId, onEvent)
      }

      for (const t of BACKEND_EVENT_TYPES) {
        this._es.addEventListener(t, (e: Event) => {
          void this._handleRawEvent(
            generation,
            (e as MessageEvent).data as string,
            researchId,
            onEvent,
            t
          )
        })
      }

      this._es.onerror = () => {
        if (this._generation !== generation) return
        if (this._completed || this._hasError) {
          // Expected close after session completed or error received
          this._es?.close()
          this._es = null
          return
        }

        // Only notify disconnect if EventSource is truly closed
        if (this._es?.readyState === EventSource.CLOSED) {
          this._running = false
          onDisconnect?.()
          onError?.(new Error('SSE connection lost'))
          this._es?.close()
          this._es = null
        }
      }
    } catch (err) {
      if (this._generation !== generation) return
      this._running = false
      onError?.(err instanceof Error ? err : new Error('Failed to open SSE stream'))
    }
  }

  private stillCurrent(generation: number, researchId: string): boolean {
    return this._generation === generation && this._researchId === researchId && this._running
  }

  private async _handleRawEvent(
    generation: number,
    data: string,
    researchId: string,
    onEvent: EventCallback,
    knownType?: BackendEventType
  ) {
    if (!this.stillCurrent(generation, researchId)) return

    let be: BackendEvent
    try {
      be = JSON.parse(data) as BackendEvent
      if (knownType && !be.type) be.type = knownType
      if (knownType && be.type !== knownType) be.type = knownType
    } catch {
      return
    }

    if (be.type === 'error') {
      this._hasError = true
    }

    if (be.type === 'paper_completed') {
      try {
        const [paperRes, stateRes] = await Promise.all([
          fetch(`${API_BASE}/api/research/${researchId}/paper`),
          fetch(`${API_BASE}/api/research/${researchId}`),
        ])

        if (!this.stillCurrent(generation, researchId)) return

        if (paperRes.ok) {
          const paperData = await paperRes.json() as { success: boolean; paper: BackendPaper }
          if (paperData.success && paperData.paper) {
            let sessionSources: BackendSessionSource[] = []
            if (stateRes.ok) {
              const stateData = await stateRes.json() as {
                success: boolean
                research?: { sources?: BackendSessionSource[] }
              }
              if (stateData.success && Array.isArray(stateData.research?.sources)) {
                sessionSources = stateData.research.sources
              }
            }

            if (!this.stillCurrent(generation, researchId)) return

            this._completed = true
            const finalPaper: FinalPaper = adaptPaper(paperData.paper, sessionSources)
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
        // Paper not retrieved — do not emit a successful paper_final.
      }

      if (!this.stillCurrent(generation, researchId)) return
      return
    }

    const adapted = adaptEvent(be)
    if (adapted && this.stillCurrent(generation, researchId)) onEvent(adapted)
  }

  stop(): void {
    this._generation += 1
    this._running = false
    this._completed = false
    this._hasError = false
    this._researchId = null
    const es = this._es
    this._es = null
    es?.close()
  }
}
