// ============================================================
// Station — one agent's workstation
// Contains desk/console, agent props, worker, animated ring,
// conflict marker, and floating label.
// All visual state comes from the AgentState passed in from
// the Zustand store via AgentStations.
// ============================================================

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import { Html, RoundedBox } from '@react-three/drei'
import type { AgentId, AgentState, AgentStatus } from '@/types'
import { Worker } from './Worker'
import { statusColor } from './labConstants'
import { useScienceBotsStore } from '@/store/useScienceBotsStore'

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────

export const STATION_TINTS: Record<AgentId, string> = {
  researcher:   '#CFE0FF',
  analyzer:     '#D9F2E6',
  writer:       '#FFE7C2',
  reviewer:     '#F4D3E4',
  orchestrator: '#E1E1F5',
}

const DESK_SHADE: Record<AgentId, string> = {
  researcher:   '#B8CDEE',
  analyzer:     '#BEDFCC',
  writer:       '#EDD4A8',
  reviewer:     '#E0BFCF',
  orchestrator: '#C8C8E4',
}

// ─────────────────────────────────────────────
// Animated status ring beneath worker
// ─────────────────────────────────────────────

function AnimatedRing({
  status,
  position,
}: {
  status: AgentStatus
  position: [number, number, number]
}) {
  const ref   = useRef<Mesh>(null)
  const color = statusColor(status)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const mat = ref.current.material as MeshBasicMaterial
    const t   = clock.elapsedTime

    switch (status) {
      case 'working':
        mat.opacity = 0.22 + Math.sin(t * 3.5) * 0.18
        break
      case 'tool_calling':
        mat.opacity = 0.26 + Math.sin(t * 5.2) * 0.22
        break
      case 'verifying':
        mat.opacity = 0.24 + Math.sin(t * 2.0) * 0.14
        break
      case 'waiting':
        mat.opacity = 0.16 + Math.sin(t * 1.2) * 0.08
        break
      case 'needs_research':
      case 'error':
        mat.opacity = 0.32 + Math.sin(t * 5.8) * 0.30
        break
      case 'completed':
        mat.opacity = 0.42
        break
      default: // idle
        mat.opacity = 0.12
    }
  })

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.19, 0.27, 20]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} />
    </mesh>
  )
}

// ─────────────────────────────────────────────
// Conflict / error marker — floating octahedron
// Only mounts when status is needs_research or error
// ─────────────────────────────────────────────

function ConflictMarker({ active }: { active: boolean }) {
  const ref = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.y = 1.18 + Math.sin(t * 4.2) * 0.07
    ref.current.rotation.y = t * 1.8
  })

  if (!active) return null

  return (
    <group ref={ref} position={[0, 1.18, 0]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.13, 0]} />
        <meshLambertMaterial
          color="#E5484D"
          emissive="#CC1010"
          emissiveIntensity={0.38}
        />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────
// Desk sub-components
// ─────────────────────────────────────────────

function Desk({ tint, shade }: { tint: string; shade: string }) {
  return (
    <group position={[0, 0, -0.08]}>
      <RoundedBox args={[0.07, 0.33, 0.55]} radius={0.025} smoothness={3} position={[-0.44, 0.165, 0]} castShadow>
        <meshLambertMaterial color={tint} />
      </RoundedBox>
      <RoundedBox args={[0.07, 0.33, 0.55]} radius={0.025} smoothness={3} position={[0.44, 0.165, 0]} castShadow>
        <meshLambertMaterial color={tint} />
      </RoundedBox>
      <RoundedBox args={[0.95, 0.065, 0.57]} radius={0.025} smoothness={3} position={[0, 0.348, 0]} castShadow receiveShadow>
        <meshLambertMaterial color={shade} />
      </RoundedBox>
      <RoundedBox args={[0.83, 0.07, 0.055]} radius={0.02} smoothness={2} position={[0, 0.25, 0.315]}>
        <meshLambertMaterial color={tint} />
      </RoundedBox>
    </group>
  )
}

function Monitor({
  position,
  screenColor,
}: {
  position: [number, number, number]
  screenColor: string
}) {
  return (
    <group position={position}>
      <RoundedBox args={[0.34, 0.22, 0.038]} radius={0.018} smoothness={2} castShadow>
        <meshLambertMaterial color="#252530" />
      </RoundedBox>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[0.27, 0.16]} />
        <meshBasicMaterial color={screenColor} />
      </mesh>
      <RoundedBox args={[0.038, 0.11, 0.038]} radius={0.01} smoothness={2} position={[0, -0.17, 0]}>
        <meshLambertMaterial color="#333" />
      </RoundedBox>
      <RoundedBox args={[0.18, 0.025, 0.1]} radius={0.01} smoothness={2} position={[0, -0.238, 0]}>
        <meshLambertMaterial color="#333" />
      </RoundedBox>
    </group>
  )
}

function PaperStack({
  position,
  tint,
}: {
  position: [number, number, number]
  tint: string
}) {
  return (
    <group position={position}>
      <RoundedBox args={[0.22, 0.014, 0.28]} radius={0.004} smoothness={2} position={[0.008, 0, -0.007]}>
        <meshLambertMaterial color="#F8F8F6" />
      </RoundedBox>
      <RoundedBox args={[0.22, 0.014, 0.28]} radius={0.004} smoothness={2} position={[0.002, 0.014, 0.003]}>
        <meshLambertMaterial color="#F4F2EE" />
      </RoundedBox>
      <RoundedBox args={[0.22, 0.014, 0.28]} radius={0.004} smoothness={2} position={[-0.004, 0.028, -0.003]}>
        <meshLambertMaterial color={tint} />
      </RoundedBox>
    </group>
  )
}

// ─────────────────────────────────────────────
// Agent-specific decorations
// ─────────────────────────────────────────────

const BOOK_DATA: Array<{ w: number; color: string }> = [
  { w: 0.09, color: '#9FBFE0' },
  { w: 0.07, color: '#6A9CC8' },
  { w: 0.11, color: '#B0D0F0' },
  { w: 0.08, color: '#7AAAD4' },
  { w: 0.09, color: '#85B4E0' },
]

function Bookshelf({ tint }: { tint: string }) {
  return (
    <group position={[0, 0, -0.44]}>
      <RoundedBox args={[0.72, 0.72, 0.13]} radius={0.03} smoothness={2} position={[0, 0.36, 0]} castShadow>
        <meshLambertMaterial color={tint} />
      </RoundedBox>
      <RoundedBox args={[0.68, 0.022, 0.12]} radius={0.008} smoothness={2} position={[0, 0.22, 0]}>
        <meshLambertMaterial color={DESK_SHADE.researcher} />
      </RoundedBox>
      {BOOK_DATA.map(({ w, color }, i) => (
        <RoundedBox key={`top-${i}`} args={[w, 0.22, 0.10]} radius={0.008} smoothness={2} position={[-0.27 + i * 0.135, 0.48, 0.005]} castShadow>
          <meshLambertMaterial color={color} />
        </RoundedBox>
      ))}
      {BOOK_DATA.slice(0, 4).map(({ w, color }, i) => (
        <RoundedBox key={`bot-${i}`} args={[w, 0.16, 0.10]} radius={0.008} smoothness={2} position={[-0.2 + i * 0.135, 0.30, 0.005]} castShadow>
          <meshLambertMaterial color={color} />
        </RoundedBox>
      ))}
    </group>
  )
}

function OrchestratorConsole({ tint }: { tint: string }) {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.52, 0.58, 0.44, 6, 1]} />
        <meshLambertMaterial color={tint} />
      </mesh>
      <mesh position={[0, 0.445, 0]}>
        <cylinderGeometry args={[0.50, 0.50, 0.03, 6, 1]} />
        <meshLambertMaterial color={DESK_SHADE.orchestrator} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.20, 0.22, 0.08, 10, 1]} />
        <meshLambertMaterial color={DESK_SHADE.orchestrator} />
      </mesh>
      <mesh position={[0, 0.60, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.17, 10]} />
        <meshLambertMaterial color="#D0D0F8" emissive="#8888CC" emissiveIntensity={0.18} />
      </mesh>
      {[0, 60, 120].map((deg) => (
        <mesh key={deg} position={[0, 0.462, 0]} rotation={[0, (deg * Math.PI) / 180, 0]}>
          <boxGeometry args={[0.008, 0.008, 0.9]} />
          <meshBasicMaterial color="#AAAACC" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function ResearcherProps({ tint }: { tint: string }) {
  return (
    <>
      <Bookshelf tint={tint} />
      <PaperStack position={[0.24, 0.41, -0.05]} tint={tint} />
      <mesh position={[-0.26, 0.45, 0.0]}>
        <torusGeometry args={[0.072, 0.018, 6, 10]} />
        <meshLambertMaterial color="#7A9EC8" />
      </mesh>
      <mesh position={[-0.165, 0.38, 0.0]} rotation={[0, 0, -0.8]}>
        <cylinderGeometry args={[0.012, 0.010, 0.11, 5]} />
        <meshLambertMaterial color="#7A9EC8" />
      </mesh>
    </>
  )
}

function AnalyzerProps({ tint }: { tint: string }) {
  const deskTop: [number, number, number] = [0, 0.416, -0.08]
  return (
    <>
      <Monitor position={[-0.25 + deskTop[0], deskTop[1] + 0.16, deskTop[2] - 0.04]} screenColor="#C6EED8" />
      <Monitor position={[0.25 + deskTop[0], deskTop[1] + 0.16, deskTop[2] - 0.04]} screenColor="#C8E8FF" />
      <PaperStack position={[0.0, 0.41, 0.14]} tint={tint} />
    </>
  )
}

function WriterProps({ tint }: { tint: string }) {
  return (
    <>
      <RoundedBox args={[0.32, 0.010, 0.24]} radius={0.004} smoothness={2} position={[-0.08, 0.415, -0.06]}>
        <meshLambertMaterial color="#FEFEF8" />
      </RoundedBox>
      <RoundedBox args={[0.012, 0.012, 0.24]} radius={0.003} smoothness={2} position={[0.08, 0.417, -0.06]}>
        <meshLambertMaterial color="#E0DDD5" />
      </RoundedBox>
      <mesh position={[0.3, 0.416, 0.04]} rotation={[0, 0.4, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.008, 0.30, 5]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      <mesh position={[0.3, 0.416, 0.19]} rotation={[0, 0.4, Math.PI / 2]}>
        <coneGeometry args={[0.011, 0.04, 5]} />
        <meshLambertMaterial color="#C8A040" />
      </mesh>
      <PaperStack position={[0.28, 0.414, -0.1]} tint={tint} />
    </>
  )
}

function ReviewerProps({ tint }: { tint: string }) {
  return (
    <>
      <PaperStack position={[-0.02, 0.414, -0.02]} tint={tint} />
      <mesh position={[0.28, 0.50, 0.06]}>
        <cylinderGeometry args={[0.068, 0.085, 0.09, 7]} />
        <meshLambertMaterial color="#D45050" />
      </mesh>
      <mesh position={[0.28, 0.44, 0.06]}>
        <cylinderGeometry args={[0.095, 0.095, 0.032, 7]} />
        <meshLambertMaterial color="#A83030" />
      </mesh>
      <mesh position={[0.28, 0.62, 0.06]}>
        <cylinderGeometry args={[0.022, 0.022, 0.14, 6]} />
        <meshLambertMaterial color="#6B3A2A" />
      </mesh>
      <mesh position={[0.28, 0.70, 0.06]}>
        <sphereGeometry args={[0.034, 6, 5]} />
        <meshLambertMaterial color="#6B3A2A" />
      </mesh>
    </>
  )
}

// ─────────────────────────────────────────────
// Floating label
// ─────────────────────────────────────────────

function AgentLabel({
  agentId,
  state,
  yOffset,
}: {
  agentId: AgentId
  state: AgentState
  yOffset: number
}) {
  const phase      = useScienceBotsStore((s) => s.phase)
  const dot        = statusColor(state.status)
  const showPaperViewer = useScienceBotsStore((s) => s.showPaperViewer)
  const isAlert    = state.status === 'needs_research' || state.status === 'error'
  const isComplete = state.status === 'completed'

  // Hide floating HTML labels during start phase or when the final paper modal is open
  if (phase === 'start' || showPaperViewer) return null
  return (
    <Html
      position={[0, yOffset, 0]}
      center
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          border: `1px solid ${isAlert ? '#F8C0C0' : isComplete ? '#B8E8C8' : '#EAE6DC'}`,
          borderRadius: 6,
          padding: '4px 8px 3px',
          fontFamily: '"Geist Mono", "Courier New", monospace',
          boxShadow: isAlert
            ? '0 2px 10px rgba(229,72,77,0.18)'
            : '0 2px 8px rgba(0,0,0,0.07)',
          width: 122,
          maxWidth: 122,
          boxSizing: 'border-box',
          backdropFilter: 'blur(4px)',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dot,
              display: 'inline-block',
              flexShrink: 0,
              boxShadow: state.status !== 'idle' ? `0 0 5px ${dot}99` : 'none',
            }}
          />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#14161A', letterSpacing: '0.08em' }}>
            {agentId.toUpperCase()}
          </span>
        </div>
        <div
          style={{
            fontSize: 8.5,
            color: isAlert ? '#B91C1C' : isComplete ? '#166534' : 'var(--dash-text-muted)',
            letterSpacing: '0.03em',
            paddingLeft: 11,
            fontWeight: isAlert || isComplete ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={state.statusLine}
        >
          {isAlert ? '⚑ ' : ''}{state.statusLine}
        </div>
      </div>
    </Html>
  )
}

// ─────────────────────────────────────────────
// Station
// ─────────────────────────────────────────────

interface StationProps {
  agentId: AgentId
  state:   AgentState
}

export function Station({ agentId, state }: StationProps) {
  const tint         = STATION_TINTS[agentId]
  const shade        = DESK_SHADE[agentId]
  const isOrch       = agentId === 'orchestrator'
  const isAlert      = state.status === 'needs_research' || state.status === 'error'
  const workerPos: [number, number, number] = isOrch ? [0.78, 0, 0.42] : [0, 0, 0.38]

  return (
    <group>
      {/* Desk or console */}
      {isOrch ? (
        <OrchestratorConsole tint={tint} />
      ) : (
        <Desk tint={tint} shade={shade} />
      )}

      {/* Agent-specific props */}
      {agentId === 'researcher' && <ResearcherProps tint={tint} />}
      {agentId === 'analyzer'   && <AnalyzerProps   tint={tint} />}
      {agentId === 'writer'     && <WriterProps      tint={tint} />}
      {agentId === 'reviewer'   && <ReviewerProps    tint={tint} />}

      {/* Worker */}
      <group position={workerPos}>
        <Worker color={tint} status={state.status} />
      </group>

      {/* Animated status ring */}
      <AnimatedRing
        status={state.status}
        position={[workerPos[0], 0.005, workerPos[2]]}
      />

      {/* Conflict / error marker */}
      <ConflictMarker active={isAlert} />

      {/* Floating label */}
      <AgentLabel
        agentId={agentId}
        state={state}
        yOffset={isOrch ? 1.52 : 1.42}
      />
    </group>
  )
}
