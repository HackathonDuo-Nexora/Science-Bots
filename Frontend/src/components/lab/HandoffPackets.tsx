// ============================================================
// HandoffPackets — animated packets travelling between stations
// Each packet reads startedAt + durationMs and computes its
// own progress in useFrame. Removes itself from the store
// when it reaches its destination.
// ============================================================

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { Group } from 'three'
import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import type { HandoffPacketState } from '@/types'
import { STATION_POSITIONS, packetColor } from './labConstants'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ─────────────────────────────────────────────
// Single packet — arcs from one station to another
// ─────────────────────────────────────────────

interface HandoffPacketProps {
  packet: HandoffPacketState
}

function HandoffPacket({ packet }: HandoffPacketProps) {
  const groupRef   = useRef<Group>(null)
  const removed    = useRef(false)
  const removeHandoff = useScienceBotsStore((s) => s.removeHandoff)

  const fromPos = STATION_POSITIONS[packet.from]
  const toPos   = STATION_POSITIONS[packet.to]
  const color   = packetColor(packet.packetType)

  useFrame(() => {
    if (!groupRef.current || removed.current) return

    const t = Math.min(1, (performance.now() - packet.startedAt) / packet.durationMs)

    if (t >= 1) {
      removed.current = true
      removeHandoff(packet.id)
      return
    }

    // Parabolic arc — peak at midpoint
    const x   = lerp(fromPos[0], toPos[0], t)
    const z   = lerp(fromPos[2], toPos[2], t)
    const arc = Math.sin(t * Math.PI) * 1.4
    const y   = lerp(fromPos[1], toPos[1], t) + arc + 0.15

    groupRef.current.position.set(x, y, z)
    groupRef.current.rotation.y += 0.04 // gentle spin
  })

  // Packet visual — shape/size varies by type
  const isConflict = packet.packetType === 'conflict'
  const w = isConflict ? 0.18 : 0.22
  const h = packet.packetType === 'draft' ? 0.20 : 0.14
  const d = isConflict ? 0.18 : 0.17

  return (
    <group ref={groupRef} position={[fromPos[0], fromPos[1] + 0.15, fromPos[2]]}>
      {/* Main body */}
      <RoundedBox args={[w, h, d]} radius={0.03} smoothness={2} castShadow>
        <meshLambertMaterial color={color} />
      </RoundedBox>
      {/* White stripe on top — like a label */}
      <mesh position={[0, h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.7, d * 0.35]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────
// HandoffPackets — renders all in-flight packets
// ─────────────────────────────────────────────

export function HandoffPackets() {
  const handoffs = useScienceBotsStore((s) => s.handoffs)

  return (
    <group>
      {handoffs.map((h) => (
        <HandoffPacket key={h.id} packet={h} />
      ))}
    </group>
  )
}
