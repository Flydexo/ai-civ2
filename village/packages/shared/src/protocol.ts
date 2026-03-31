import type { WorldState, EntityPatch, VillagerAction, PerceptionEvent, WorldObject } from './types.js'

// ─── Client → Server ──────────────────────────────────────────────────────────

export interface HelloMessage {
  type: 'HELLO'
  clientType: 'viewer' | 'agent'
  villagerIdToControl?: string
}

export interface ActionMessage {
  type: 'ACTION'
  villagerIdActing: string
  action: VillagerAction
}

export type ClientMessage = HelloMessage | ActionMessage

// ─── Server → Client ──────────────────────────────────────────────────────────

export interface WorldSnapshotMessage {
  type: 'WORLD_SNAPSHOT'
  state: WorldState
}

export interface WorldDeltaMessage {
  type: 'WORLD_DELTA'
  tick: number
  gameTime: string
  entities: EntityPatch[]
  speeches: SpeechEvent[]
}

export interface SpeechEvent {
  speakerId: string
  targetId: string | 'broadcast'
  text: string
}

export interface AgentPerceptionMessage {
  type: 'AGENT_PERCEPTION'
  villagerIdAffected: string
  events: PerceptionEvent[]
}

export interface WorldEventMessage {
  type: 'WORLD_EVENT'
  event: {
    kind: string
    [key: string]: unknown
  }
}

export interface ObjectStateMessage {
  type: 'OBJECT_STATE'
  object: WorldObject
}

export interface ErrorMessage {
  type: 'ERROR'
  message: string
}

export type ServerMessage =
  | WorldSnapshotMessage
  | WorldDeltaMessage
  | AgentPerceptionMessage
  | WorldEventMessage
  | ObjectStateMessage
  | ErrorMessage
