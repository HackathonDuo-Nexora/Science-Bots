// ============================================================
// StartScreen — initial centered card
// Topic input + suggestion chips + START RESEARCH button.
// Uses store.startMission() — no workflow logic here.
// ============================================================

import { useState } from 'react'

const SUGGESTIONS = [
  'Impact of artificial intelligence on cybersecurity',
  'AI in Healthcare Diagnostics',
  'Quantum Computing Applications',
  'Climate Change Mitigation Strategies',
]

interface StartScreenProps {
  onStart: (topic: string) => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [topic, setTopic] = useState('')

  const handleStart = () => {
    const t = topic.trim() || 'Impact of artificial intelligence on cybersecurity'
    onStart(t)
  }

  return (
    <div className="start-overlay">
      <div className="start-card">
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#14161A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3.5" fill="#CFE0FF" />
              <line x1="12" y1="2" x2="12" y2="6.5" stroke="#CFE0FF" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="17.5" x2="12" y2="22" stroke="#CFE0FF" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="12" x2="6.5" y2="12" stroke="#D9F2E6" strokeWidth="2" strokeLinecap="round" />
              <line x1="17.5" y1="12" x2="22" y2="12" stroke="#D9F2E6" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.93" y1="4.93" x2="8.1" y2="8.1" stroke="#FFE7C2" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="15.9" y1="15.9" x2="19.07" y2="19.07" stroke="#FFE7C2" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.08em',
            color: '#14161A',
            marginBottom: 4,
          }}>
            SCIENCE BOTS
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}>
            Autonomous Research Laboratory
          </div>

          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            fontWeight: 600,
            color: '#14161A',
            lineHeight: 1.3,
          }}>
            What should the team research?
          </div>
        </div>

        {/* Topic input */}
        <input
          id="topic-input"
          className="start-input"
          type="text"
          placeholder="Enter a research topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          autoFocus
          style={{ marginBottom: 10 }}
        />

        {/* Suggestions */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 18,
        }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="suggestion-chip"
              onClick={() => setTopic(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Action */}
        <button
          id="start-research-btn"
          className="start-btn"
          onClick={handleStart}
        >
          START RESEARCH
        </button>

        <div style={{
          marginTop: 14,
          textAlign: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          color: 'var(--text-dim)',
        }}>
          Multi-agent autonomous research pipeline
        </div>
      </div>
    </div>
  )
}
