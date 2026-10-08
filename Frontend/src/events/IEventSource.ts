// ============================================================
// EventSource Interface
// All event sources (Mock, Live) must implement this contract.
// The UI and store NEVER depend on transport specifics.
// ============================================================

import type { ResearchEvent } from '@/types'

export type EventCallback = (event: ResearchEvent) => void
export type DisconnectCallback = () => void
export type ErrorCallback = (err: Error) => void

export interface IEventSource {
  /**
   * Subscribe to the event stream.
   * Returns an unsubscribe function.
   */
  subscribe(
    onEvent: EventCallback,
    onDisconnect?: DisconnectCallback,
    onError?: ErrorCallback
  ): () => void

  /** Imperatively stop the source. */
  stop(): void

  /** Whether this source is currently active. */
  readonly isRunning: boolean
}
