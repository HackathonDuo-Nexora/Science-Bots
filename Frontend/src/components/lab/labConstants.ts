// ============================================================
// Lab Constants — shared positions, route defs, color helpers
// Single source of truth for layout and semantic colors.
// ============================================================

import type { AgentId, AgentStatus, HandoffPacketType, RouteId } from '@/types'

export const PLATFORM_Y = 0.278

// Isometric station positions — world space, on platform surface
export const STATION_POSITIONS: Record<AgentId, [number, number, number]> = {
  researcher:   [-3.1, PLATFORM_Y, -2.9],
  analyzer:     [ 3.1, PLATFORM_Y, -2.9],
  orchestrator: [ 0.0, PLATFORM_Y,  0.0],
  writer:       [-3.1, PLATFORM_Y,  2.9],
  reviewer:     [ 3.1, PLATFORM_Y,  2.9],
}

// All route definitions
export interface RouteDef { id: RouteId; from: AgentId; to: AgentId }
export const ROUTE_DEFINITIONS: RouteDef[] = [
  { id: 'orchestrator-researcher', from: 'orchestrator', to: 'researcher' },
  { id: 'orchestrator-analyzer',   from: 'orchestrator', to: 'analyzer'   },
  { id: 'orchestrator-writer',     from: 'orchestrator', to: 'writer'     },
  { id: 'orchestrator-reviewer',   from: 'orchestrator', to: 'reviewer'   },
  { id: 'researcher-analyzer',     from: 'researcher',   to: 'analyzer'   },
  { id: 'analyzer-writer',         from: 'analyzer',     to: 'writer'     },
  { id: 'writer-reviewer',         from: 'writer',       to: 'reviewer'   },
]

// Status → dot/ring color
export function statusColor(status: AgentStatus): string {
  switch (status) {
    case 'working':
    case 'tool_calling':   return '#2F5BFF'
    case 'verifying':      return '#22A06B'
    case 'waiting':        return '#E8A317'
    case 'needs_research': return '#E5484D'
    case 'completed':      return '#22A06B'
    case 'error':          return '#E5484D'
    default:               return '#7A7F87'
  }
}

// Packet type → color
export function packetColor(type: HandoffPacketType): string {
  switch (type) {
    case 'evidence': return '#2F5BFF'
    case 'draft':    return '#E8A317'
    case 'conflict': return '#E5484D'
  }
}
