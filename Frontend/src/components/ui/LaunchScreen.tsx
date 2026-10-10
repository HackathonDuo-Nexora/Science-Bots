// ============================================================
// LaunchScreen — Autonomous AI Research Laboratory
// Recomposed Editorial Split-Screen Layout
// Left: Clean typography, compelling headline, prominent CTA
// Right: Self-contained 5-agent network visualization with core
// ============================================================

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ShieldCheck, Atom } from 'lucide-react'
import { ResearchCoreCanvas } from './ResearchCoreCanvas'

interface LaunchScreenProps {
  onLaunch: () => void
}

interface AgentNode {
  id: string
  name: string
  role: string
  color: string
  pos: { top: string; left: string }
}

const AGENTS: AgentNode[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Workflow Director',
    color: '#818CF8',
    pos: { top: '12%', left: '50%' },
  },
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'Source Discovery',
    color: '#6395FF',
    pos: { top: '32%', left: '84%' },
  },
  {
    id: 'analyzer',
    name: 'Analyzer',
    role: 'Claim Verification',
    color: '#38BDF8',
    pos: { top: '80%', left: '74%' },
  },
  {
    id: 'writer',
    name: 'Writer',
    role: 'Paper Synthesis',
    color: '#A5B4FC',
    pos: { top: '80%', left: '26%' },
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'Audit & Critique',
    color: '#34D399',
    pos: { top: '32%', left: '16%' },
  },
]

export function LaunchScreen({ onLaunch }: LaunchScreenProps) {
  const [isActivating, setIsActivating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleInitialize = () => {
    if (isActivating) return
    setIsActivating(true)
    timerRef.current = setTimeout(() => {
      onLaunch()
    }, 450)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="launch-universe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Subtle, restrained ambient backdrop */}
        <div className="launch-bg-grid" aria-hidden="true" />

        {/* Minimal Header */}
        <header className="launch-header">
          <div className="launch-brand-group">
            <div className="launch-brand-icon">
              <Atom size={18} className="brand-atom" />
            </div>
            <span className="launch-brand-title">SCIENCE BOTS</span>
            <span className="launch-version-badge">v1.0</span>
          </div>

          <div className="launch-header-right">
            <div className="launch-status-indicator">
              <span className="status-dot-pulse" />
              <span className="status-label">System Ready</span>
            </div>
          </div>
        </header>

        {/* Main Content Area: Split Screen */}
        <main className="launch-hero-split">
          {/* Left Column: Clean Editorial Content */}
          <motion.div
            className="launch-content-col"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="launch-eyebrow">
              <span className="eyebrow-pip" />
              <span>AUTONOMOUS AI RESEARCH LABORATORY</span>
            </div>

            <h1 className="launch-hero-title">
              Research, verified <br className="hero-br" />by evidence.
            </h1>

            <p className="launch-hero-description">
              Five specialized AI agents discover academic sources, analyze claims,
              and turn evidence into structured research papers.
            </p>

            <div className="launch-cta-block">
              <button
                id="launch-start-btn"
                className={`launch-primary-btn ${isActivating ? 'is-activating' : ''}`}
                onClick={handleInitialize}
                disabled={isActivating}
                aria-label="Initialize Science Bots Research Laboratory"
              >
                <span className="btn-text">
                  {isActivating ? 'Connecting Laboratory...' : 'Initialize Research'}
                </span>
                <ArrowRight size={16} className="btn-arrow" />
              </button>

              <div className="launch-reassurance">
                <ShieldCheck size={14} className="reassurance-icon" />
                <span>No setup required · Real-time academic consensus</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Dedicated Agent Network Visualization */}
          <motion.div
            className="launch-visual-col"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="agent-network-container">
              {/* Subtle accent glow behind the network core */}
              <div className="network-glow" aria-hidden="true" />

              {/* Central 3D Core Canvas — contained strictly inside the center */}
              <div className="network-core-anchor">
                <ResearchCoreCanvas />
              </div>

              {/* Contained SVG Connection Lines */}
              <svg
                className="network-svg-lines"
                aria-hidden="true"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6395FF" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#818CF8" stopOpacity="0.15" />
                  </linearGradient>
                </defs>

                {/* Concentric telemetry guide ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="21"
                  fill="none"
                  stroke="rgba(99, 149, 255, 0.12)"
                  strokeDasharray="2 3"
                />

                {/* Radial connection lines to each agent */}
                <line x1="50" y1="50" x2="50" y2="18" stroke="url(#lineGrad)" strokeWidth="0.8" />
                <line x1="50" y1="50" x2="78" y2="34" stroke="url(#lineGrad)" strokeWidth="0.8" />
                <line x1="50" y1="50" x2="71" y2="76" stroke="url(#lineGrad)" strokeWidth="0.8" />
                <line x1="50" y1="50" x2="29" y2="76" stroke="url(#lineGrad)" strokeWidth="0.8" />
                <line x1="50" y1="50" x2="22" y2="34" stroke="url(#lineGrad)" strokeWidth="0.8" />
              </svg>

              {/* Agent Node Badges */}
              <div className="agent-nodes-layer">
                {AGENTS.map((agent) => (
                  <div
                    key={agent.id}
                    className="agent-card-node"
                    style={{
                      top: agent.pos.top,
                      left: agent.pos.left,
                    }}
                  >
                    <div
                      className="agent-card-pip"
                      style={{
                        backgroundColor: agent.color,
                        boxShadow: `0 0 8px ${agent.color}80`,
                      }}
                    />
                    <div className="agent-card-meta">
                      <span className="agent-card-name">{agent.name}</span>
                      <span className="agent-card-role">{agent.role}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Central Core Label */}
              <div className="network-core-label">
                <span>CONSENSUS CORE</span>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Minimal Footer */}
        <footer className="launch-footer">
          <div className="launch-footer-left">
            <span>Science Bots · Multi-Agent Academic Research Engine</span>
          </div>

          <div className="launch-footer-right">
            <span>Deterministic Verification · OpenAlex & Gemini</span>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  )
}
