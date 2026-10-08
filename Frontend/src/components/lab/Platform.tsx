// ============================================================
// Platform — The single floating research-lab slab
// Simple rounded box, cream palette, receives + casts shadows
// ============================================================

import { useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { Mesh } from 'three'

// Soft elliptical drop-shadow decal beneath the platform
function DropShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]} receiveShadow>
      <planeGeometry args={[13, 13]} />
      <meshBasicMaterial color="#C8C2B4" transparent opacity={0.18} />
    </mesh>
  )
}

export function Platform() {
  const ref = useRef<Mesh>(null)

  return (
    <group>
      {/* Main floating slab */}
      <RoundedBox
        ref={ref}
        args={[11, 0.55, 11]}
        radius={0.18}
        smoothness={4}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshLambertMaterial color="#EAE6DC" />
      </RoundedBox>

      {/* Thin base ledge — gives depth to the platform */}
      <RoundedBox
        args={[10.2, 0.18, 10.2]}
        radius={0.1}
        smoothness={4}
        position={[0, -0.36, 0]}
        castShadow
        receiveShadow
      >
        <meshLambertMaterial color="#DDD8CE" />
      </RoundedBox>

      {/* Invisible shadow-receiving ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>

      <DropShadow />
    </group>
  )
}
