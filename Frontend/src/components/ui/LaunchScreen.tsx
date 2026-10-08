// ============================================================
// LaunchScreen — lightweight initial Science Bots presentation
// Displayed on cold open before the user enters the laboratory.
// ============================================================

interface LaunchScreenProps {
  onLaunch: () => void
}

const AGENTS = [
  { name: 'ORCHESTRATOR', role: 'Workflow Coordinator', color: '#8884D8' },
  { name: 'RESEARCHER',   role: 'Scholarly Evidence Search', color: '#2F5BFF' },
  { name: 'ANALYZER',     role: 'Evidence Verification', color: '#22A06B' },
  { name: 'WRITER',       role: 'Paper Synthesis', color: '#E8A317' },
  { name: 'REVIEWER',     role: 'Critique & Quality Control', color: '#D84B88' },
]

export function LaunchScreen({ onLaunch }: LaunchScreenProps) {
  return (
    <div className="launch-overlay">
      <div className="launch-card">
        {/* Brand mark */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: '#14161A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.5" fill="#CFE0FF" />
            <line x1="12" y1="2" x2="12" y2="6.5" stroke="#CFE0FF" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="17.5" x2="12" y2="22" stroke="#CFE0FF" strokeWidth="2" strokeLinecap="round" />
            <line x1="2" y1="12" x2="6.5" y2="12" stroke="#D9F2E6" strokeWidth="2" strokeLinecap="round" />
            <line x1="17.5" y1="12" x2="22" y2="12" stroke="#D9F2E6" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.93" y1="4.93" x2="8.1" y2="8.1" stroke="#FFE7C2" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="15.9" y1="15.9" x2="19.07" y2="19.07" stroke="#FFE7C2" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Title & Subtitle */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: '0.12em',
          color: '#14161A',
          marginBottom: 4,
        }}>
          SCIENCE BOTS
        </div>

        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
          marginBottom: 16,
        }}>
          Autonomous Research Laboratory
        </div>

        {/* Short description */}
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13.5,
          color: '#4A4E57',
          lineHeight: 1.6,
          maxWidth: 420,
          margin: '0 auto 24px',
        }}>
          An autonomous team of AI research agents that discovers, verifies, and reviews scientific evidence.
        </p>

        {/* Multi-agent visual strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 28,
          padding: '10px 14px',
          background: '#F9F7F2',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-soft)',
        }}>
          {AGENTS.map((a) => (
            <div
              key={a.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 12,
                background: 'white',
                border: '1px solid var(--border-soft)',
                fontSize: 9.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: '#2A2D35',
                letterSpacing: '0.04em',
              }}
            >
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: a.color,
                display: 'inline-block',
              }} />
              {a.name}
            </div>
          ))}
        </div>

        {/* Primary CTA */}
        <button
          id="launch-start-btn"
          className="launch-btn"
          onClick={onLaunch}
        >
          START RESEARCH
        </button>

        {/* Secondary subtle text */}
        <div style={{
          marginTop: 14,
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          color: 'var(--text-dim)',
          letterSpacing: '0.02em',
        }}>
          Evidence-driven multi-agent research
        </div>
      </div>
    </div>
  )
}
