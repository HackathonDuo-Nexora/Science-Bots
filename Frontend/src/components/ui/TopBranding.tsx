// ============================================================
// TopBranding — top-left brand mark + demo/live chip
// ============================================================

import { useScienceBotsStore } from '@/store/useScienceBotsStore'

export function TopBranding() {
  const isDemo = useScienceBotsStore((s) => s.isDemo)
  const phase  = useScienceBotsStore((s) => s.phase)

  if (phase === 'start') return null

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Logo mark */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: '#14161A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" fill="#CFE0FF" />
            <line x1="8" y1="1" x2="8" y2="4" stroke="#CFE0FF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="12" x2="8" y2="15" stroke="#CFE0FF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="1" y1="8" x2="4" y2="8" stroke="#D9F2E6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="8" x2="15" y2="8" stroke="#D9F2E6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 13,
            color: '#14161A',
            letterSpacing: '0.06em',
          }}>
            SCIENCE BOTS
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}>
            Autonomous Research Laboratory
          </div>
        </div>
      </div>

      <div style={{ paddingLeft: 36 }}>
        <span className={`chip ${isDemo ? 'chip-demo' : 'chip-live'}`}>
          <span style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: isDemo ? '#B07B00' : '#1A7A4E',
            display: 'inline-block',
          }} />
          {isDemo ? 'DEMO MODE' : 'LIVE'}
        </span>
      </div>
    </div>
  )
}
