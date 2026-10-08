// ============================================================
// ResearchCoreCanvas — 3D Holographic Research Core
// Lightweight, futuristic, high-performance visual centerpiece
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
  const ring3Ref = useRef<Mesh>(null)
  const particlesRef = useRef<Points>(null)

  // Generate sparse floating data particles
  const [particlePositions, particleColors] = useMemo(() => {
    const count = 120
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const color1 = new THREE.Color('#38BDF8') // Cyan
    const color2 = new THREE.Color('#818CF8') // Indigo
    const color3 = new THREE.Color('#34D399') // Emerald

    for (let i = 0; i < count; i++) {
      const radius = 2.0 + Math.random() * 2.8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const mixed = Math.random() > 0.6 ? color1 : Math.random() > 0.3 ? color2 : color3
      colors[i * 3]     = mixed.r
      colors[i * 3 + 1] = mixed.g
      colors[i * 3 + 2] = mixed.b
    }

    return [positions, colors]
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // Smooth rotations for orbital elements
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.08
    }

    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.y = -t * 0.15
      innerSphereRef.current.rotation.x = t * 0.10
      const pulse = 1 + Math.sin(t * 1.8) * 0.04
      innerSphereRef.current.scale.set(pulse, pulse, pulse)
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.12
      ring1Ref.current.rotation.x = Math.PI / 4 + Math.sin(t * 0.3) * 0.1
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.18
      ring2Ref.current.rotation.z = Math.PI / 3 + Math.cos(t * 0.25) * 0.1
    }

    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = t * 0.09
      ring3Ref.current.rotation.y = Math.PI / 6 + Math.sin(t * 0.2) * 0.08
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.04
    }
  })

  return (
    <group ref={coreRef}>
      {/* Central pulsating glowing node */}
      <mesh ref={innerSphereRef}>
        <icosahedronGeometry args={[1.2, 2]} />
        <meshBasicMaterial
          color="#38BDF8"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Solid translucent nucleus */}
      <mesh>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshBasicMaterial
          color="#818CF8"
          transparent
          opacity={0.22}
        />
      </mesh>

      {/* Center point of pure light */}
      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Orbital Ring 1 — Cyan primary ring */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.0, 0.015, 16, 80]} />
        <meshBasicMaterial
          color="#38BDF8"
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Orbital Ring 2 — Violet secondary ring */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.5, 0.012, 16, 80]} />
        <meshBasicMaterial
          color="#818CF8"
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Orbital Ring 3 — Outer telemetry ring */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[3.1, 0.01, 16, 80]} />
        <meshBasicMaterial
          color="#38BDF8"
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Surrounding particle cloud */}
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
          size={0.045}
          vertexColors
          transparent
          opacity={0.65}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

export function ResearchCoreCanvas() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1,
      overflow: 'hidden',
    }}>
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.4} />
        <CoreGeometry />
      </Canvas>
    </div>
  )
}
