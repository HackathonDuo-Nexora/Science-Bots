// ============================================================
// PaperViewer — full-screen overlay for the final paper
// Opens when paper_final fires + user clicks the 3D slab
// or the FINAL PAPER READY badge.
// ============================================================

import { useState } from 'react'
import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import type { FinalPaper } from '@/types'

function PaperBadge() {
  const finalPaper       = useScienceBotsStore((s) => s.finalPaper)
  const setShowPaperViewer = useScienceBotsStore((s) => s.setShowPaperViewer)

  if (!finalPaper) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
    }}>
      <button
        id="paper-ready-badge"
        onClick={() => setShowPaperViewer(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 18px',
          background: '#14161A',
          color: 'white',
          border: 'none',
          borderRadius: 24,
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.30)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#22A06B',
          flexShrink: 0,
        }} />
        FINAL PAPER READY — VIEW
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Full paper viewer
// ─────────────────────────────────────────────

function Viewer({ paper }: { paper: FinalPaper }) {
  const setShowPaperViewer = useScienceBotsStore((s) => s.setShowPaperViewer)
  const isDemo = useScienceBotsStore((s) => s.isDemo) || Boolean((paper as unknown as { metadata?: { demo?: boolean }; demo?: boolean }).metadata?.demo ?? (paper as unknown as { demo?: boolean }).demo)
  const [copied, setCopied] = useState(false)

  const buildMarkdown = () => {
    return [
      `# ${paper.title}`,
      '',
      '## Abstract',
      paper.abstract,
      '',
      '## Key Findings',
      ...paper.keyFindings.map((f, i) => `${i + 1}. ${f}`),
      '',
      ...paper.sections.map((s) => `## ${s.title}\n\n${s.content}\n`),
      '## Sources & References',
      ...paper.sources.map((s, i) => `[${i + 1}] ${s.title}${s.url ? ` (${s.url})` : ''}`),
    ].join('\n')
  }

  const handleCopy = () => {
    const text = buildMarkdown()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => undefined)
  }

  const handleExport = () => {
    const text = buildMarkdown()
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(paper.title || 'science_bots_paper').replace(/[^a-zA-Z0-9_-]/g, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="paper-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowPaperViewer(false)
      }}
    >
      <div className="paper-viewer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="paper-viewer-header">
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--green)',
                letterSpacing: '0.10em',
              }}>
                RESEARCH COMPLETE
              </span>
              {isDemo && (
                <span className="chip chip-demo" style={{ fontSize: 8.5, padding: '1px 6px' }}>
                  DEMO
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              maxWidth: 480,
              lineHeight: 1.3,
            }}>
              {paper.title}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button
              id="paper-copy-btn"
              className="paper-close-btn"
              onClick={handleCopy}
              style={{ minWidth: 62 }}
            >
              {copied ? 'COPIED!' : 'COPY'}
            </button>
            <button
              id="paper-export-btn"
              className="paper-export-btn"
              onClick={handleExport}
            >
              EXPORT
            </button>
            <button
              id="paper-close-btn"
              className="paper-close-btn"
              onClick={() => setShowPaperViewer(false)}
              style={{ fontWeight: 600 }}
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="paper-viewer-body sb-scroll">
          {/* Abstract */}
          <section style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.10em',
              marginBottom: 8,
            }}>
              ABSTRACT
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text-primary)',
            }}>
              {paper.abstract}
            </p>
          </section>

          {/* Key findings */}
          <section style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.10em',
              marginBottom: 10,
            }}>
              KEY FINDINGS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {paper.keyFindings.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--blue)',
                    flexShrink: 0,
                    marginTop: 1,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Sections */}
          {paper.sections.map((section, i) => (
            <section key={i} style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
                marginBottom: 6,
              }}>
                {section.title}
              </div>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                lineHeight: 1.7,
                color: '#3A3D44',
              }}>
                {section.content}
              </p>
            </section>
          ))}

          {/* Sources */}
          <section style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.10em',
              marginBottom: 10,
            }}>
              SOURCES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paper.sources.map((src, i) => (
                <div key={src.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-dim)',
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    [{i + 1}]
                  </span>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}>
                      {src.title}
                    </div>
                    {src.excerpt && (
                      <div style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}>
                        {src.excerpt}
                      </div>
                    )}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 3,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: src.stance === 'supports' ? 'var(--green)' :
                                    src.stance === 'contradicts' ? 'var(--red)' : 'var(--text-muted)',
                        display: 'inline-block',
                      }} />
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: 'var(--text-dim)',
                        letterSpacing: '0.04em',
                      }}>
                        {(src.stance ?? 'neutral').toUpperCase()}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Public exports
// ─────────────────────────────────────────────

export function PaperBadgeAndViewer() {
  const showPaperViewer = useScienceBotsStore((s) => s.showPaperViewer)
  const finalPaper      = useScienceBotsStore((s) => s.finalPaper)

  return (
    <>
      <PaperBadge />
      {showPaperViewer && finalPaper && <Viewer paper={finalPaper} />}
    </>
  )
}
