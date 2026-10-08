// ============================================================
// LaunchScreen — Autonomous AI Research Laboratory Experience
// Cinematic, futuristic, high-end laboratory interface
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Search,
  ShieldCheck,
  FileText,
  CheckCircle,
  ArrowRight,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
} from 'lucide-react'
import { ResearchCoreCanvas } from './ResearchCoreCanvas'

interface LaunchScreenProps {
  onLaunch: () => void
}

interface AgentNode {
  id: string
  name: string
  role: string
  subrole: string
  color: string
  glowColor: string
  icon: typeof Search
  status: string
  position: {
    desktop: { top?: string; bottom?: string; left?: string; right?: string }
  }
}

const AGENTS: AgentNode[] = [
  {
    id: 'orchestrator',
    name: 'ORCHESTRATOR',
    role: 'Workflow Director',
    subrole: 'Feedback Loop Routing',
    color: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.25)',
    icon: Compass,
    status: 'ACTIVE',
    position: {
      desktop: { top: '16%', left: '12%' },
    },
  },
  {
    id: 'researcher',
    name: 'RESEARCHER',
    role: 'Scholarly Discovery',
    subrole: 'OpenAlex Knowledge Base',
    color: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    icon: Search,
    status: 'ONLINE',
    position: {
      desktop: { top: '16%', right: '12%' },
    },
  },
  {
    id: 'analyzer',
    name: 'ANALYZER',
    role: 'Evidence Verification',
    subrole: 'Gemini AI Fact-Checking',
    color: '#34D399',
    glowColor: 'rgba(52, 211, 153, 0.25)',
    icon: ShieldCheck,
    status: 'STANDBY',
    position: {
      desktop: { top: '48%', left: '8%' },
    },
  },
  {
    id: 'writer',
    name: 'WRITER',
    role: 'Paper Synthesis',
    subrole: 'Iterative Section Drafting',
    color: '#FBBF24',
    glowColor: 'rgba(251, 191, 36, 0.25)',
    icon: FileText,
    status: 'READY',
    position: {
      desktop: { bottom: '16%', left: '15%' },
    },
  },
  {
    id: 'reviewer',
    name: 'REVIEWER',
    role: 'Critique & Audit',
    subrole: 'Citation Consistency Check',
    color: '#F472B6',
    glowColor: 'rgba(244, 114, 182, 0.25)',
    icon: CheckCircle,
    status: 'STANDBY',
    position: {
      desktop: { bottom: '16%', right: '15%' },
    },
  },
]

export function LaunchScreen({ onLaunch }: LaunchScreenProps) {
  const [isActivating, setIsActivating] = useState(false)

  const handleInitialize = () => {
    if (isActivating) return
    setIsActivating(true)
    // Smooth cinematic transition timing
    setTimeout(() => {
      onLaunch()
    }, 650)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="launch-universe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Background Grid & Ambient Glows */}
        <div className="launch-bg-grid" />
        <div className="launch-glow-cyan" />
        <div className="launch-glow-violet" />

        {/* 3D Holographic Research Core */}
        <ResearchCoreCanvas />

        {/* Dynamic Connection Pulse SVG Overlay (Desktop) */}
        <svg className="launch-connections" aria-hidden="true">
          <defs>
            <linearGradient id="cyanLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="violetLineGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Radial telemetry guides */}
          <circle cx="50%" cy="50%" r="220" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeDasharray="3 6" />
          <circle cx="50%" cy="50%" r="340" fill="none" stroke="rgba(129, 140, 248, 0.06)" strokeDasharray="4 8" />

          {/* Ray lines to agent stations */}
          <line x1="50%" y1="50%" x2="22%" y2="24%" stroke="url(#cyanLineGrad)" strokeWidth="1" strokeDasharray="6 6" className="pulse-line" />
          <line x1="50%" y1="50%" x2="78%" y2="24%" stroke="url(#cyanLineGrad)" strokeWidth="1" strokeDasharray="6 6" className="pulse-line" />
          <line x1="50%" y1="50%" x2="18%" y2="52%" stroke="url(#violetLineGrad)" strokeWidth="1" strokeDasharray="6 6" className="pulse-line" />
          <line x1="50%" y1="50%" x2="25%" y2="80%" stroke="url(#violetLineGrad)" strokeWidth="1" strokeDasharray="6 6" className="pulse-line" />
          <line x1="50%" y1="50%" x2="75%" y2="80%" stroke="url(#cyanLineGrad)" strokeWidth="1" strokeDasharray="6 6" className="pulse-line" />
        </svg>

        {/* Top Laboratory Telemetry Header */}
        <header className="launch-header">
          <div className="launch-header-left">
            <span className="launch-status-pill">
              <span className="launch-live-dot" />
              SYSTEM STATUS : ONLINE
            </span>
            <span className="launch-meta-tag">
              <Terminal size={11} className="inline mr-1 opacity-70" />
              PROTOCOL v2.4
            </span>
          </div>

          <div className="launch-header-right">
            <span className="launch-meta-tag">
              <Cpu size={11} className="inline mr-1 opacity-70" />
              5 AUTONOMOUS MODULES
            </span>
            <span className="launch-meta-tag">
              <Sparkles size={11} className="inline mr-1 opacity-70" />
              EVIDENCE-FIRST PIPELINE
            </span>
          </div>
        </header>

        {/* Floating Autonomous Agent Nodes (Surrounding the Core) */}
        <div className="launch-agent-layer">
          {AGENTS.map((agent, i) => {
            const Icon = agent.icon
            return (
              <motion.div
                key={agent.id}
                className={`launch-agent-card agent-${agent.id}`}
                style={{
                  ...agent.position.desktop,
                  borderColor: `rgba(${agent.id === 'orchestrator' ? '129, 140, 248' : agent.id === 'researcher' ? '56, 189, 248' : agent.id === 'analyzer' ? '52, 211, 153' : agent.id === 'writer' ? '251, 191, 36' : '244, 114, 182'}, 0.28)`,
                  boxShadow: `0 8px 32px -4px rgba(0, 0, 0, 0.45), 0 0 20px ${agent.glowColor}`,
                }}
                initial={{ opacity: 0, y: 14, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.4 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, scale: 1.03 }}
              >
                <div className="agent-card-top">
                  <div className="agent-icon-badge" style={{ background: `${agent.color}15`, color: agent.color }}>
                    <Icon size={14} />
                  </div>
                  <div className="agent-status-tag" style={{ color: agent.color }}>
                    <span className="agent-dot" style={{ background: agent.color }} />
                    {agent.status}
                  </div>
                </div>

                <div className="agent-name">{agent.name}</div>
                <div className="agent-role">{agent.role}</div>
                <div className="agent-subrole">{agent.subrole}</div>
              </motion.div>
            )
          })}
        </div>

        {/* Central Hero Interface */}
        <main className="launch-hero-center">
          <motion.div
            className="launch-hero-content"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Supertitle badge */}
            <motion.div
              className="launch-lab-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              <Layers size={13} className="text-cyan-400" />
              <span>SYNCHRONIZED MULTI-AGENT INTELLIGENCE</span>
            </motion.div>

            {/* Main Brand Title */}
            <h1 className="launch-main-title">
              SCIENCE BOTS
            </h1>

            {/* Subtitle */}
            <h2 className="launch-subtitle">
              AUTONOMOUS RESEARCH LABORATORY
            </h2>

            {/* Supporting Copy */}
            <p className="launch-description">
              An autonomous AI research team that discovers evidence, verifies claims,
              writes, reviews, and improves research in real time.
            </p>

            {/* System Activation CTA Button */}
            <div className="launch-cta-container">
              <button
                id="launch-start-btn"
                className={`launch-activate-btn ${isActivating ? 'is-activating' : ''}`}
                onClick={handleInitialize}
                disabled={isActivating}
                aria-label="Initialize Science Bots Research Laboratory"
              >
                <span className="btn-glow-ring" />
                <span className="btn-scan-line" />
                <span className="btn-inner-content">
                  <span className="btn-status-pip" />
                  <span className="btn-text">
                    {isActivating ? 'CONNECTING LABORATORY...' : 'INITIALIZE RESEARCH'}
                  </span>
                  <ArrowRight size={16} className="btn-arrow" />
                </span>
              </button>

              <div className="launch-sub-cta-text">
                Evidence-driven multi-agent research • Instant access
              </div>
            </div>
          </motion.div>
        </main>

        {/* Bottom Telemetry Footer */}
        <footer className="launch-footer">
          <div className="launch-footer-left">
            <span>SCHOLARLY REPOSITORIES</span>
            <span className="footer-dot">•</span>
            <span>OPENALEX VERIFICATION</span>
            <span className="footer-dot">•</span>
            <span>GEMINI 3.8 REASONING</span>
          </div>

          <div className="launch-footer-right">
            <span>AUTOMATED AGENT CONSENSUS PROTOCOL</span>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  )
}
