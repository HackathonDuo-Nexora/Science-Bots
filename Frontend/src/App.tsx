// ============================================================
// App — root component
// Manages phase transitions and wires the event source to the
// store. All UI overlays live here above the 3D scene.
//
// Architecture:
//   EventSource → dispatch(event) → Zustand → Scene + UI
// ============================================================

import { useEffect, useRef } from 'react'
import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import { MockEventSource } from '@/events/MockEventSource'
import { Scene } from '@/components/lab/Scene'
import { StartScreen }         from '@/components/ui/StartScreen'
import { TopBranding }         from '@/components/ui/TopBranding'
import { MissionPill }         from '@/components/ui/MissionPill'
import { ActivityPanel }       from '@/components/ui/ActivityPanel'
import { ClaimCard }           from '@/components/ui/ClaimCard'
import { ConflictBanner }      from '@/components/ui/ConflictBanner'
import { PaperBadgeAndViewer } from '@/components/ui/PaperBadgeAndViewer'
import { StatusOverlay }       from '@/components/ui/StatusOverlay'

function App() {
  const phase        = useScienceBotsStore((s) => s.phase)
  const startMission  = useScienceBotsStore((s) => s.startMission)
  const dispatch      = useScienceBotsStore((s) => s.dispatch)

  const srcRef = useRef<MockEventSource | null>(null)

  // Cleanup event source on unmount or reset
  const stopSource = () => {
    srcRef.current?.stop()
    srcRef.current = null
  }

  useEffect(() => () => stopSource(), [])

  // Handle mission start — called by StartScreen
  const handleStart = (topic: string) => {
    stopSource()
    startMission(topic, /* demo */ true)

    const src = new MockEventSource()
    src.setTopic(topic)
    srcRef.current = src
    src.subscribe((event) => dispatch(event))
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
        {/* Start screen overlay — shown when phase === 'start' */}
        {phase === 'start' && (
          <StartScreen onStart={handleStart} />
        )}

        {/* Persistent UI — shown when mission is active */}
        <TopBranding />
        <MissionPill />
        <ActivityPanel />

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
