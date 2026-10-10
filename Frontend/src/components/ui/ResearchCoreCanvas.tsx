// ============================================================
// ResearchCoreCanvas — 3D Holographic Research Core
// Sophisticated, restrained, compact visual centerpiece
// Designed to sit cleanly inside the Agent Network container
// ============================================================

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group, Points, Mesh } from 'three'
import * as THREE from 'three'

function CoreGeometry() {
  const coreRef = useRef<Group>(null)
  const innerSphereRef = useRef<Mesh>(null)
  const ring1Ref = useRef<Mesh>(null)
  const ring2Ref = useRef<Mesh>(null)
  const particlesRef = useRef<Points>(null)

  // Generate a small, restrained set of floating data points (40 points)
  const [particlePositions, particleColors] = useMemo(() => {
    const count = 40
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const color1 = new THREE.Color('#6395FF') // Primary accent
    const color2 = new THREE.Color('#818CF8') // Supporting indigo

    for (let i = 0; i < count; i++) {
      const radius = 1.4 + Math.random() * 1.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const mixed = Math.random() > 0.5 ? color1 : color2
      colors[i * 3]     = mixed.r
      colors[i * 3 + 1] = mixed.g
      colors[i * 3 + 2] = mixed.b
    }

    return [positions, colors]
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Gentle, restrained rotations
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.05
    }

    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.y = -t * 0.08
      innerSphereRef.current.rotation.x = t * 0.05
      const pulse = 1 + Math.sin(t * 1.5) * 0.03
      innerSphereRef.current.scale.set(pulse, pulse, pulse)
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.07
      ring1Ref.current.rotation.x = Math.PI / 4 + Math.sin(t * 0.2) * 0.05
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.09
      ring2Ref.current.rotation.z = Math.PI / 3 + Math.cos(t * 0.18) * 0.05
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.025
    }
  })

  return (
    <group ref={coreRef}>
      {/* Central geometric wireframe cage */}
      <mesh ref={innerSphereRef}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial
          color="#6395FF"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Inner glowing core */}
      <mesh>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshBasicMaterial
          color="#818CF8"
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Center point of pure light */}
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Single primary orbital ring */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.65, 0.012, 16, 64]} />
        <meshBasicMaterial
          color="#6395FF"
          transparent
          opacity={0.32}
        />
      </mesh>

      {/* Secondary restrained telemetry ring */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.05, 0.008, 16, 64]} />
        <meshBasicMaterial
          color="#818CF8"
          transparent
          opacity={0.20}
        />
      </mesh>

      {/* Delicate particle cloud */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[particleColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

interface ResearchCoreCanvasProps {
  className?: string
  style?: React.CSSProperties
}

export function ResearchCoreCanvas({ className, style }: ResearchCoreCanvasProps) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        ...style,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <CoreGeometry />
      </Canvas>
    </div>
  )
}
