// ============================================================
// LiveEventSource
// Consumes the real backend event stream via Server-Sent Events (SSE).
// This is a STUB — no backend logic lives here.
// When the backend teammate provides an endpoint, set VITE_API_URL.
//
// Transport: SSE  (switch to WebSocket by swapping the internals)
// ============================================================

import type { IEventSource, EventCallback, DisconnectCallback, ErrorCallback } from './IEventSource'
import type { ResearchEvent } from '@/types'

const DEFAULT_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/events'

export class LiveEventSource implements IEventSource {
  private _es: EventSource | null = null
  private _running = false
  private _url: string

  constructor(url?: string) {
    this._url = url ?? DEFAULT_URL
  }

  get isRunning(): boolean {
    return this._running
  }

  subscribe(
    onEvent: EventCallback,
    onDisconnect?: DisconnectCallback,
    onError?: ErrorCallback
  ): () => void {
    if (this._running) this.stop()

    try {
      this._es = new EventSource(this._url)
      this._running = true

      this._es.onmessage = (e: MessageEvent) => {
        try {
          const event: ResearchEvent = JSON.parse(e.data as string)
          onEvent(event)
        } catch (parseErr) {
          console.warn('[LiveEventSource] Failed to parse event:', e.data, parseErr)
        }
      }

      this._es.onerror = () => {
        console.error('[LiveEventSource] Connection error')
        this._running = false
        onDisconnect?.()
        onError?.(new Error('SSE connection lost'))
        this._es?.close()
        this._es = null
      }
    } catch (err) {
      this._running = false
      onDisconnect?.()
      onError?.(err instanceof Error ? err : new Error('Failed to open SSE connection'))
    }

    return () => this.stop()
  }

  stop(): void {
    this._running = false
    this._es?.close()
    this._es = null
  }
}
