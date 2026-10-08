// ============================================================
// RouteLines — floor connection lines between agent stations
// Routes are dim when idle; they light up (colored) when
// an event activates them. Color comes from the packet type
// of any in-flight handoff using that route.
// ============================================================

import { Line } from '@react-three/drei'
import { useScienceBotsStore } from '@/store/useScienceBotsStore'
import type { HandoffPacketState, RouteId } from '@/types'
import { getRouteId } from '@/types'
import {
  STATION_POSITIONS,
  ROUTE_DEFINITIONS,
  packetColor,
} from './labConstants'

const FLOOR_Y = 0.285 // just above platform surface

function routeActiveColor(routeId: RouteId, handoffs: HandoffPacketState[]): string | null {
  for (const h of handoffs) {
    const rId = getRouteId(h.from, h.to)
    if (rId === routeId) return packetColor(h.packetType)
  }
  return null
}

export function RouteLines() {
  const activeRoutes = useScienceBotsStore((s) => s.activeRoutes)
  const handoffs     = useScienceBotsStore((s) => s.handoffs)

  return (
    <group>
      {ROUTE_DEFINITIONS.map(({ id, from, to }) => {
        const isActive   = activeRoutes.includes(id)
        const fromPos    = STATION_POSITIONS[from]
        const toPos      = STATION_POSITIONS[to]
        const activeCol  = routeActiveColor(id, handoffs)
        const color      = isActive && activeCol ? activeCol : '#BAB6AE'
        const opacity    = isActive ? 0.82 : 0.20
        const lineWidth  = isActive ? 2.8 : 0.9

        return (
          <Line
            key={id}
            points={[
              [fromPos[0], FLOOR_Y, fromPos[2]],
              [toPos[0],   FLOOR_Y, toPos[2]],
            ]}
            color={color}
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
          />
        )
      })}
    </group>
  )
}
