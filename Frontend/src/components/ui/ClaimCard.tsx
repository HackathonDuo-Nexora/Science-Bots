// ============================================================
// ClaimCard — bottom-left claim evidence panel
// Shows current claim, sources, verification status.
// Clicking opens EvidenceView.
// ============================================================

import { useState } from 'react'
import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import type { Claim, Source } from '@/types'

// ─────────────────────────────────────────────
// Verification badge
// ─────────────────────────────────────────────
function VerificationBadge({ status }: { status: Claim['verificationStatus'] }) {
  const map = {
    pending:     { label: 'PENDING',     bg: '#F5F1E8', color: '#8A7A50', border: '#D8CFA8' },
    supported:   { label: 'SUPPORTED',   bg: '#DCFAEB', color: '#1A7A4E', border: '#90D8B0' },
    conflict:    { label: 'CONFLICT',    bg: '#FFE4E4', color: '#B02020', border: '#F0A0A0' },
    unsupported: { label: 'UNSUPPORTED', bg: '#FFF0DC', color: '#B06000', border: '#F0C880' },
  }
  const s = map[status]
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: 12,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      letterSpacing: '0.06em',
    }}>
      {s.label}
    </span>
  )
}

// ─────────────────────────────────────────────
// Source chip
// ─────────────────────────────────────────────
function SourceChip({ source }: { source: Source }) {
  const stanceColor =
    source.stance === 'supports'     ? 'var(--green)' :
    source.stance === 'contradicts'  ? 'var(--red)' :
    'var(--text-muted)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px 3px 5px',
      borderRadius: 6,
      background: '#F8F5EF',
      border: '1px solid var(--border-soft)',
      fontSize: 10,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: stanceColor, flexShrink: 0,
      }} />
      <span style={{
        maxWidth: 140,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {source.title}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Evidence view (expanded)
// ─────────────────────────────────────────────
function EvidenceView({ claim, sources, onClose }: {
  claim: Claim
  sources: Source[]
  onClose: () => void
}) {
  return (
    <div className="panel" style={{ padding: '14px 16px', marginTop: 6 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
        }}>
          EVIDENCE DETAIL
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', padding: '0 2px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Claim text */}
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        color: 'var(--text-primary)',
        lineHeight: 1.5,
        padding: '8px 10px',
        background: '#F8F5EF',
        borderRadius: 6,
        marginBottom: 10,
      }}>
        {claim.text}
      </div>

      {/* Sources */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-dim)',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        SOURCES ({sources.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {sources.map((src) => (
          <div key={src.id} style={{
            padding: '6px 8px',
            borderRadius: 6,
            background: '#FAFAF8',
            border: `1px solid ${src.stance === 'contradicts' ? '#F0C0C0' : 'var(--border-soft)'}`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 3,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: src.stance === 'supports' ? 'var(--green)' :
                            src.stance === 'contradicts' ? 'var(--red)' : 'var(--text-muted)',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {src.title}
              </span>
            </div>
            {src.excerpt && (
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                paddingLeft: 11,
              }}>
                "{src.excerpt}"
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Verification status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingTop: 8,
        borderTop: '1px solid var(--border-soft)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-dim)',
          letterSpacing: '0.06em',
        }}>
          VERIFICATION
        </span>
        <VerificationBadge status={claim.verificationStatus} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ClaimCard
// ─────────────────────────────────────────────

export function ClaimCard() {
  const [expanded, setExpanded] = useState(false)
  const claims     = useScienceBotsStore((s) => s.claims)
  const phase      = useScienceBotsStore((s) => s.phase)
  const finalPaper = useScienceBotsStore((s) => s.finalPaper)

  if (phase === 'start') return null

  // Pick the most recent claim to display
  const claim = claims.length > 0 ? claims[claims.length - 1] : null

  // Get sources from the final paper or a placeholder
  const sources: Source[] = finalPaper?.sources ?? []
  const claimSources = sources.filter((s) =>
    claim ? (claim.sourceIds ?? []).includes(s.id) : false
  )

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: 20,
      width: 272,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      zIndex: 30,
    }}>
      {/* Evidence view (expanded) */}
      {expanded && claim && (
        <EvidenceView
          claim={claim}
          sources={claimSources.length > 0 ? claimSources : sources.slice(0, 2)}
          onClose={() => setExpanded(false)}
        />
      )}

      {/* Main claim card */}
      <div
        className="panel"
        style={{
          padding: '12px 14px',
          cursor: claim ? 'pointer' : 'default',
          borderColor: claim?.verificationStatus === 'conflict' ? '#F0C0C0' : 'var(--border)',
          transition: 'border-color 0.2s',
        }}
        onClick={() => claim && setExpanded(!expanded)}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}>
            CURRENT CLAIM
          </span>
          {claim && <VerificationBadge status={claim.verificationStatus} />}
        </div>

        {claim ? (
          <>
            {/* Claim text */}
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              marginBottom: 8,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {claim.text}
            </div>

            {/* Evidence count + sources */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-dim)',
              }}>
                {claim.evidenceIds.length} evidence
              </span>
              <span style={{ color: 'var(--border)', fontSize: 9 }}>·</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-dim)',
              }}>
                {claim.sourceIds.length} sources
              </span>
            </div>

            {/* Source chips */}
            {sources.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {sources.slice(0, 2).map((src) => (
                  <SourceChip key={src.id} source={src} />
                ))}
                {sources.length > 2 && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-dim)',
                    paddingLeft: 5,
                  }}>
                    +{sources.length - 2} more
                  </span>
                )}
              </div>
            )}

            <div style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-dim)',
              letterSpacing: '0.04em',
            }}>
              {expanded ? 'CLICK TO COLLAPSE' : 'CLICK FOR EVIDENCE'}
            </div>
          </>
        ) : (
          <div style={{
            padding: '12px 0',
            textAlign: 'center',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--text-dim)',
          }}>
            Awaiting claims...
          </div>
        )}
      </div>
    </div>
  )
}
