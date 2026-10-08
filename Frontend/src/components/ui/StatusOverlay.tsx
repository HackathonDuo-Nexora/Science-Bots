// ============================================================
// StatusOverlay — loading, disconnected, error states
// Lightweight — does NOT create extra pages.
// ============================================================

import { useScienceBotsStore } from '@/store/useScienceBotsStore'

export function StatusOverlay() {
  const phase = useScienceBotsStore((s) => s.phase)
  const reset = useScienceBotsStore((s) => s.reset)

  if (phase === 'loading') {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
          marginBottom: 12,
        }}>
          INITIALIZING RESEARCH TEAM
        </div>
        <div style={{
          display: 'flex',
          gap: 6,
          justifyContent: 'center',
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--text-muted)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.3); }
          }
        `}</style>
      </div>
    )
  }

  if (phase === 'disconnected') {
    return (
      <div style={{
        position: 'absolute',
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
      }}>
        <div className="panel" style={{
          padding: '10px 18px',
          borderColor: '#F0D080',
          background: '#FFFBF0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--amber)', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: '#B07800',
            letterSpacing: '0.06em',
            marginRight: 8,
          }}>
            BACKEND DISCONNECTED
          </span>
          <button
            onClick={reset}
            style={{
              background: 'none',
              border: '1px solid #D0B060',
              borderRadius: 5,
              padding: '2px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#B07800',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            RESET
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={{
        position: 'absolute',
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
      }}>
        <div className="panel" style={{
          padding: '10px 18px',
          borderColor: '#F0C0C0',
          background: '#FFF8F8',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--red)', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: '#B02020',
            letterSpacing: '0.06em',
            marginRight: 8,
          }}>
            AGENT ERROR
          </span>
          <button
            onClick={reset}
            style={{
              background: 'none',
              border: '1px solid #D08080',
              borderRadius: 5,
              padding: '2px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#B02020',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            RESET
          </button>
        </div>
      </div>
    )
  }

  return null
}
