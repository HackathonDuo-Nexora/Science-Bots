// ============================================================
// ActivityPanel — top-right scrollable event feed
// Shows last 8 events from the Zustand store.
// Driven entirely by the ResearchEvent log.
// ============================================================

import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import type { ResearchEvent } from '@/types'
import {
  ArrowRight,
  Plus,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  FileEdit,
  Star,
  X,
  Dot,
} from 'lucide-react'

function agentLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function eventIcon(type: ResearchEvent['type']): { Icon: React.ElementType; color: string } {
  switch (type) {
    case 'handoff':                 return { Icon: ArrowRight,    color: 'var(--accent)' }
    case 'evidence_found':          return { Icon: Plus,           color: 'var(--accent)' }
    case 'claim_verified':          return { Icon: CheckCircle,   color: 'var(--state-green)' }
    case 'conflict_detected':       return { Icon: AlertTriangle, color: 'var(--state-red)' }
    case 'insufficient_evidence':   return { Icon: HelpCircle,   color: 'var(--state-amber)' }
    case 'revision_required':       return { Icon: RefreshCw,    color: 'var(--state-amber)' }
    case 'draft_updated':           return { Icon: FileEdit,      color: 'var(--state-amber)' }
    case 'paper_final':             return { Icon: Star,          color: 'var(--state-green)' }
    case 'error':                   return { Icon: X,             color: 'var(--state-red)' }
    default:                        return { Icon: Dot,            color: 'var(--dash-text-muted)' }
  }
}

function relTime(isoTs: string): string {
  const diffMs = Date.now() - new Date(isoTs).getTime()
  if (diffMs < 2000) return 'just now'
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s`
  return `${Math.floor(diffMs / 60000)}m`
}

interface EventRowProps { event: ResearchEvent }
function EventRow({ event }: EventRowProps) {
  const { Icon, color } = eventIcon(event.type)
  const isConflict  = event.type === 'conflict_detected'
  const isNeedsWork = event.type === 'insufficient_evidence' || event.type === 'revision_required'
  const isFinal     = event.type === 'paper_final'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '7px 0',
      borderBottom: '1px solid var(--border-soft)',
      opacity: 1,
    }}>
      {/* Icon */}
      <div style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
      }}>
        <Icon size={10} style={{ color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: isConflict ? '#B91C1C' : isNeedsWork ? '#8A6A20' : isFinal ? '#166534' : 'var(--dash-text-primary)',
            letterSpacing: '0.06em',
          }}>
            {agentLabel(event.agent)}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--dash-text-dim)',
          }}>
            {relTime(event.ts)}
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          color: isConflict ? '#B91C1C' : isNeedsWork ? '#8A6A20' : 'var(--dash-text-muted)',
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {event.message}
        </div>
      </div>
    </div>
  )
}

export function ActivityPanel() {
  const events = useScienceBotsStore((s) => s.events)
  const phase  = useScienceBotsStore((s) => s.phase)

  if (phase === 'start') return null

  const visible = events.slice(0, 8)

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: 248,
      zIndex: 30,
    }}>
      <div className="panel" style={{ padding: '10px 14px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: '#6B7280',
            letterSpacing: '0.1em',
          }}>
            ACTIVITY
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#6B7280',
          }}>
            {events.length} events
          </span>
        </div>

        {/* Event list */}
        <div className="sb-scroll" style={{ maxHeight: 260, overflowY: 'auto' }}>
          {visible.length === 0 ? (
            <div style={{
              padding: '16px 0',
              textAlign: 'center',
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: '#6B7280',
            }}>
              Waiting for events...
            </div>
          ) : (
            visible.map((e) => <EventRow key={e.id} event={e} />)
          )}
        </div>
      </div>
    </div>
  )
}
