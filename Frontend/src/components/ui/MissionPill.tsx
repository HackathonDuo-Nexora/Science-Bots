// ============================================================
// MissionPill — top-center floating mission progress pill
// Shows topic, progress %, and phase indicator
// ============================================================

import { useScienceBotsStore } from '@/store/useScienceBotsStore'

export function MissionPill() {
  const phase    = useScienceBotsStore((s) => s.phase)
  const topic    = useScienceBotsStore((s) => s.topic)
  const progress = useScienceBotsStore((s) => s.progress)

  if (phase === 'start') return null

  const phaseLabel =
    phase === 'loading'      ? 'INITIALIZING' :
    phase === 'completed'    ? 'COMPLETE' :
    phase === 'error'        ? 'ERROR' :
    phase === 'disconnected' ? 'DISCONNECTED' :
    `${progress}%`

  const phaseColor =
    phase === 'completed'    ? 'var(--state-green)' :
    phase === 'error'        ? 'var(--state-red)' :
    phase === 'disconnected' ? 'var(--state-amber)' :
    'var(--accent)'

  const phaseTextColor =
    phase === 'completed'    ? '#166534' :
    phase === 'error'        ? '#B91C1C' :
    phase === 'disconnected' ? '#B45309' :
    '#1D4ED8'

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      pointerEvents: 'none',
      zIndex: 30,
    }}>
      <div className="panel" style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Phase dot */}
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: phaseColor,
          flexShrink: 0,
          boxShadow: phase === 'active' ? `0 0 7px ${phaseColor}` : 'none',
        }} />

        {/* Topic */}
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--dash-text-primary)',
          maxWidth: 280,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {topic || 'Research Mission'}
        </span>

        {/* Divider */}
        <span style={{ color: 'var(--dash-text-dim)', fontSize: 14 }}>|</span>

        {/* Progress */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: phaseTextColor,
          letterSpacing: '0.04em',
          minWidth: 44,
          textAlign: 'right',
        }}>
          {phaseLabel}
        </span>
      </div>

      {/* Progress track */}
      {phase === 'active' && (
        <div className="progress-track" style={{ width: 280 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
