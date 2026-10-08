// ============================================================
// Worker — tiny low-poly figure made entirely from primitives
// Body + head + arms + legs. Animates when status is active.
// ============================================================

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { Group } from 'three'
import type { AgentStatus } from '@/types'

interface WorkerProps {
  /** Body/clothing colour — station tint */
  color: string
  status: AgentStatus
}

const SKIN = '#F0C4A0'
const DARK = '#4A4A56'

export function Worker({ color, status }: WorkerProps) {
  const ref = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime

    switch (status) {
      case 'working':
        ref.current.position.y = Math.sin(t * 2.6) * 0.024
        ref.current.rotation.y = 0
        break
      case 'tool_calling':
        ref.current.position.y = Math.sin(t * 4.4) * 0.026
        ref.current.rotation.y = Math.sin(t * 1.8) * 0.10
        break
      case 'verifying':
        ref.current.position.y = Math.sin(t * 1.7) * 0.016
        ref.current.rotation.y = Math.sin(t * 0.6) * 0.06
        break
      case 'waiting':
        ref.current.position.y = Math.sin(t * 0.9) * 0.008
        break
      default:
        // Spring back to rest
        ref.current.position.y *= 0.88
        ref.current.rotation.y *= 0.88
        if (Math.abs(ref.current.position.y) < 0.0008) {
          ref.current.position.y = 0
          ref.current.rotation.y = 0
        }
    }
  })

  return (
    <group ref={ref}>
      {/* Legs */}
      <RoundedBox args={[0.09, 0.19, 0.09]} radius={0.02} smoothness={2} position={[-0.07, 0.095, 0]} castShadow>
        <meshLambertMaterial color={DARK} />
      </RoundedBox>
      <RoundedBox args={[0.09, 0.19, 0.09]} radius={0.02} smoothness={2} position={[0.07, 0.095, 0]} castShadow>
        <meshLambertMaterial color={DARK} />
      </RoundedBox>

      {/* Body */}
      <RoundedBox args={[0.28, 0.29, 0.18]} radius={0.05} smoothness={3} position={[0, 0.34, 0]} castShadow>
        <meshLambertMaterial color={color} />
      </RoundedBox>

      {/* Arms */}
      <RoundedBox args={[0.08, 0.22, 0.08]} radius={0.02} smoothness={2} position={[-0.20, 0.33, 0]} castShadow>
        <meshLambertMaterial color={color} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.22, 0.08]} radius={0.02} smoothness={2} position={[0.20, 0.33, 0]} castShadow>
        <meshLambertMaterial color={color} />
      </RoundedBox>

      {/* Neck */}
      <mesh position={[0, 0.51, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, 0.08, 6]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.64, 0]} castShadow>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
    </group>
  )
}
