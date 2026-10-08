// ============================================================
// ConflictBanner — appears when conflict_detected fires
// Connects visually with the red packet in the 3D scene.
// Auto-resolves when claim is verified/supported.
// ============================================================

import { useScienceBotsStore } from '@/store/useScienceBotsStore'

export function ConflictBanner() {
  const claims = useScienceBotsStore((s) => s.claims)
  const events = useScienceBotsStore((s) => s.events)
  const phase  = useScienceBotsStore((s) => s.phase)

  if (phase === 'start') return null

  // Check if there is an active conflict
  const latestClaim = claims.length > 0 ? claims[claims.length - 1] : null
  const hasConflict  = latestClaim?.verificationStatus === 'conflict'
  const hasResolved  = latestClaim?.verificationStatus === 'supported'

  // Check for the conflict event in history
  const conflictEvent = events.find((e) => e.type === 'conflict_detected')
  if (!conflictEvent && !hasResolved) return null

  // Once resolved, show a brief "verified" banner
  if (hasResolved) {
    return (
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 240,
      }}>
        <div className="panel" style={{
          padding: '10px 14px',
          borderColor: '#B8E8C8',
          background: '#F2FBF6',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--green)',
              flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: '#1A7A4E',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}>
                CLAIM VERIFIED
              </div>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                color: '#2A8A5E',
              }}>
                Reviewer approved — conflict resolved.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active conflict state
  if (!hasConflict) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 240,
    }}>
      <div className="panel" style={{
        padding: '10px 14px',
        borderColor: '#F0C0C0',
        background: '#FFF8F8',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          {/* Pulsing red dot */}
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--red)',
            flexShrink: 0,
            marginTop: 3,
            boxShadow: '0 0 8px rgba(229,72,77,0.5)',
          }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--red)',
              letterSpacing: '0.06em',
              marginBottom: 3,
            }}>
              CLAIM NEEDS RESEARCH
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 10,
              color: '#8A3030',
              lineHeight: 1.4,
            }}>
              Reviewer flagged conflicting evidence. Orchestrator re-routing to Researcher.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
