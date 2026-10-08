// ============================================================
// AgentStations — places all 5 stations on the platform
// Reads agent state from Zustand store.
// Positions are fixed; layout mirrors the planning doc.
// ============================================================

import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import type { AgentId } from '@/types'
import { Station } from './Station'
import { STATION_POSITIONS } from './labConstants'

export function AgentStations() {
  const agents = useScienceBotsStore((s) => s.agents)

  return (
    <group>
      {(Object.keys(STATION_POSITIONS) as AgentId[]).map((agentId) => (
        <group key={agentId} position={STATION_POSITIONS[agentId]}>
          <Station agentId={agentId} state={agents[agentId]} />
        </group>
      ))}
    </group>
  )
}
