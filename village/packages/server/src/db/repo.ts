import { getDb } from './database.js'
import type { Villager, WorldObject, TilePos } from '@village/shared'

// ─── Villager Repo ─────────────────────────────────────────────────────────────

interface VillagerRow {
  id: string
  name: string
  role: string
  position_x: number
  position_y: number
  schedule: string
  memory: string
}

export function loadAllVillagers(): Villager[] {
  const rows = getDb().prepare('SELECT * FROM villagers').all() as VillagerRow[]
  return rows.map(rowToVillager)
}

function rowToVillager(row: VillagerRow): Villager {
  return {
    id: row.id,
    name: row.name,
    role: row.role as Villager['role'],
    position: { x: row.position_x, y: row.position_y },
    facing: 'down',
    animation: 'idle',
    currentZoneId: 'village_square',
    schedule: JSON.parse(row.schedule),
    controlledBy: 'server',
    agentConnected: false,
  }
}

export function saveVillagerPosition(id: string, pos: TilePos): void {
  getDb().prepare(
    'UPDATE villagers SET position_x = ?, position_y = ? WHERE id = ?'
  ).run(pos.x, pos.y, id)
}

export function saveVillagerMemory(id: string, memory: unknown): void {
  getDb().prepare(
    'UPDATE villagers SET memory = ? WHERE id = ?'
  ).run(JSON.stringify(memory), id)
}

// ─── World Object Repo ─────────────────────────────────────────────────────────

interface WorldObjectRow {
  id: string
  type: string
  position_x: number
  position_y: number
  zone_id: string
  state: string
}

export function loadAllObjects(): WorldObject[] {
  const rows = getDb().prepare('SELECT * FROM world_objects').all() as WorldObjectRow[]
  return rows.map(rowToObject)
}

function rowToObject(row: WorldObjectRow): WorldObject {
  return {
    id: row.id,
    type: row.type as WorldObject['type'],
    position: { x: row.position_x, y: row.position_y },
    zoneId: row.zone_id,
    state: JSON.parse(row.state),
    interactRange: 1,
  }
}

export function saveObjectState(id: string, state: Record<string, unknown>): void {
  getDb().prepare(
    'UPDATE world_objects SET state = ? WHERE id = ?'
  ).run(JSON.stringify(state), id)
}

// ─── Event Log ────────────────────────────────────────────────────────────────

export function logEvent(tick: number, gameTime: string, type: string, payload: unknown): void {
  getDb().prepare(
    'INSERT INTO events_log (tick, game_time, type, payload, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(tick, gameTime, type, JSON.stringify(payload), Date.now())
}

export function getRecentEvents(limit = 50): unknown[] {
  return getDb().prepare(
    'SELECT * FROM events_log ORDER BY id DESC LIMIT ?'
  ).all(limit)
}
