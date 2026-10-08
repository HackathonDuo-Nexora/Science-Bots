// ============================================================
// Scene — React Three Fiber Canvas
// Orthographic camera, isometric angle, soft shadows, warm light
// ============================================================

import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { OrthographicCamera as ThreeOrthoCamera } from 'three'
import { Platform } from './Platform'
import { AgentStations } from './AgentStations'
import { RouteLines } from './RouteLines'
import { HandoffPackets } from './HandoffPackets'

// ─────────────────────────────────────────────
// CameraRig — sets up orthographic camera
// facing isometric direction [1, 1, 1] normalised
// ─────────────────────────────────────────────
function CameraRig() {
  const { camera, size } = useThree()

  useEffect(() => {
    const cam = camera as ThreeOrthoCamera
    if (!cam.isOrthographicCamera) return
    const f = 13 // frustum height in world units
    const aspect = size.width / size.height
    cam.left   = (-f * aspect) / 2
    cam.right  = ( f * aspect) / 2
    cam.top    =  f / 2
    cam.bottom = -f / 2
    cam.near   = 0.1
    cam.far    = 200
    cam.position.set(20, 17, 20)
    cam.lookAt(0, 0, 0)
    cam.updateProjectionMatrix()
  }, [camera, size])

  return null
}

// ─────────────────────────────────────────────
// Lights
// ─────────────────────────────────────────────
function Lights() {
  return (
    <>
      {/* Base warm ambient */}
      <ambientLight intensity={0.8} color="#FFF9F0" />

      {/* Hemisphere — sky warm, ground cool */}
      <hemisphereLight color="#F8F4EC" groundColor="#D8D0C4" intensity={0.45} />

      {/* Key directional — casts shadows */}
      <directionalLight
        position={[12, 20, 10]}
        intensity={1.0}
        color="#FFF8EE"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Soft fill — right/back, no shadows */}
      <directionalLight
        position={[-8, 8, -6]}
        intensity={0.3}
        color="#EEF0FF"
      />
    </>
  )
}

// ─────────────────────────────────────────────
// Scene
// ─────────────────────────────────────────────
export function Scene() {
  return (
    <Canvas
      orthographic
      shadows
      camera={{
        // Initial values overridden by CameraRig
        position: [20, 17, 20],
        near: 0.1,
        far: 200,
        zoom: 1,
      }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: true, alpha: false }}
    >
      {/* Warm cream background */}
      <color attach="background" args={['#F4F1EA']} />

      <CameraRig />
      <Lights />
      <Platform />
      <RouteLines />
      <AgentStations />
      <HandoffPackets />
    </Canvas>
  )
}

