// ─── Primitives ───────────────────────────────────────────────────────────────

export interface TilePos {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// ─── Time ─────────────────────────────────────────────────────────────────────

export type TimePhase = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'

export interface GameTime {
  hour: number    // 0–23
  minute: number  // 0–59
  phase: TimePhase
  tick: number
}

export function getPhase(hour: number): TimePhase {
  if (hour >= 5 && hour < 7)   return 'dawn'
  if (hour >= 7 && hour < 12)  return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// ─── World Objects ─────────────────────────────────────────────────────────────

export type WorldObjectType = 'door' | 'chest' | 'bed' | 'well' | 'crop' | 'sign' | 'firepit'

export interface WorldObject {
  id: string
  type: WorldObjectType
  position: TilePos
  zoneId: string
  state: Record<string, unknown>
  interactRange: number
}

// ─── Villager ─────────────────────────────────────────────────────────────────

export type VillagerRole = 'blacksmith' | 'farmer' | 'innkeeper' | 'priest' | 'herbalist' | 'merchant' | 'child' | 'elder'
export type VillagerFacing = 'up' | 'down' | 'left' | 'right'
export type VillagerAnimation = 'idle' | 'walk' | 'work' | 'sleep'
export type VillagerController = 'server' | 'agent' | 'human'

export interface Villager {
  id: string
  name: string
  role: VillagerRole
  position: TilePos
  facing: VillagerFacing
  animation: VillagerAnimation
  currentZoneId: string
  schedule: Partial<Record<TimePhase, string>>
  controlledBy: VillagerController
  agentConnected: boolean
}

// ─── Zone ─────────────────────────────────────────────────────────────────────

export interface Zone {
  id: string
  label: string
  bounds: Rect
  capacity: number
}

// ─── World State ──────────────────────────────────────────────────────────────

export interface WorldState {
  tick: number
  gameTime: GameTime
  villagers: Villager[]
  objects: WorldObject[]
  zones: Zone[]
}

export interface EntityPatch {
  id: string
  position?: TilePos
  facing?: VillagerFacing
  animation?: VillagerAnimation
  currentZoneId?: string
  controlledBy?: VillagerController
  agentConnected?: boolean
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type VillagerAction =
  | { kind: 'MOVE';     path: TilePos[] }
  | { kind: 'INTERACT'; objectId: string }
  | { kind: 'SPEAK';    targetId: string | 'broadcast'; text: string }
  | { kind: 'EMOTE';    emote: 'wave' | 'sleep' | 'work' | 'think' }
  | { kind: 'WAIT';     durationTicks: number }
  | { kind: 'POSSESS';  villagerIdTarget: string }

// ─── Perception ───────────────────────────────────────────────────────────────

export type PerceptionEvent =
  | { kind: 'NEARBY_SPEECH';  speakerId: string; text: string; distance: number }
  | { kind: 'ENTITY_ENTERED'; entityId: string; zoneId: string }
  | { kind: 'ENTITY_LEFT';    entityId: string; zoneId: string }
  | { kind: 'OBJECT_CHANGED'; objectId: string; newState: unknown }
  | { kind: 'TIME_PHASE';     phase: TimePhase }
  | { kind: 'ADDRESSED';      speakerId: string; text: string }
