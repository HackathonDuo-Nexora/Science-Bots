// ============================================================
// App — root component
// Manages phase transitions and wires the event source to the
// store. All UI overlays live here above the 3D scene.
//
// Architecture:
//   BackendEventSource → dispatch(event) → Zustand → Scene + UI
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import { BackendEventSource } from '@/events/BackendEventSource'
import { Scene } from '@/components/lab/Scene'
import { LaunchScreen }        from '@/components/ui/LaunchScreen'
import { StartScreen }         from '@/components/ui/StartScreen'
import { TopBranding }         from '@/components/ui/TopBranding'
import { MissionPill }         from '@/components/ui/MissionPill'
import { ActivityPanel }       from '@/components/ui/ActivityPanel'
import { ClaimCard }           from '@/components/ui/ClaimCard'
import { ConflictBanner }      from '@/components/ui/ConflictBanner'
import { PaperBadgeAndViewer } from '@/components/ui/PaperBadgeAndViewer'
import { StatusOverlay }       from '@/components/ui/StatusOverlay'

function App() {
  const [hasLaunched, setHasLaunched] = useState(false)
  const phase        = useScienceBotsStore((s) => s.phase)
  const startMission  = useScienceBotsStore((s) => s.startMission)
  const dispatch      = useScienceBotsStore((s) => s.dispatch)
  const setDisconnected = useScienceBotsStore((s) => s.setDisconnected)

  const srcRef = useRef<BackendEventSource | null>(null)

  // Cleanup event source on unmount or reset
  const stopSource = () => {
    srcRef.current?.stop()
    srcRef.current = null
  }

  useEffect(() => () => stopSource(), [])

  // Handle mission start — called by StartScreen
  const handleStart = (topic: string) => {
    stopSource()
    startMission(topic, /* demo */ false)

    const src = new BackendEventSource(topic)
    srcRef.current = src
    src.subscribe(
      (event) => dispatch(event),
      () => setDisconnected(),
      (err) => {
        console.error('[App] Backend connection error:', err.message)
        setDisconnected()
      }
    )
  }


  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--bg)',
    }}>
      {/* 3D world — always rendered */}
      <Scene />

      {/* HUD layer — sits above the canvas */}
      <div className="hud">
        {/* Initial Launch Screen — shown on cold open */}
        {!hasLaunched && (
          <LaunchScreen onLaunch={() => setHasLaunched(true)} />
        )}

        {/* Workspace Topic Setup — shown in workspace when phase === 'start' */}
        {hasLaunched && phase === 'start' && (
          <StartScreen onStart={handleStart} />
        )}

        {/* Persistent UI — shown once workspace is launched */}
        {hasLaunched && (
          <>
            <TopBranding />
            <MissionPill />
            <ActivityPanel />
          </>
        )}

        {/* Status overlays (loading, error, disconnected) */}
        <StatusOverlay />

        {/* Bottom panels — only during active/completed phases */}
        {(phase === 'active' || phase === 'completed') && (
          <>
            <ClaimCard />
            <ConflictBanner />
          </>
        )}

        {/* Final paper badge + viewer */}
        <PaperBadgeAndViewer />
      </div>
    </div>
  )
}

export default App
