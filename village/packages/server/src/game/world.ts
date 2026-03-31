import { ZONES, ZONE_MAP, getZoneAt } from '@village/shared'
import type {
  Villager, WorldObject, WorldState, EntityPatch, TilePos, VillagerAction,
  PerceptionEvent, TimePhase
} from '@village/shared'
import { GameClock } from './time.js'
import { loadAllVillagers, loadAllObjects, saveVillagerPosition, saveObjectState, logEvent } from '../db/repo.js'

const MAP_SIZE = 40

export class WorldState_ {
  private villagers = new Map<string, Villager>()
  private objects = new Map<string, WorldObject>()
  readonly clock = new GameClock()

  // Pending speeches to broadcast in next delta
  private pendingSpeeches: Array<{ speakerId: string; targetId: string | 'broadcast'; text: string }> = []

  // Pending perception events per villager
  private pendingPerceptions = new Map<string, PerceptionEvent[]>()

  // Wait counters: villagerID → ticks remaining
  private waitCounters = new Map<string, number>()

  // Move queues: villagerID → path
  private movePaths = new Map<string, TilePos[]>()

  load(): void {
    const vs = loadAllVillagers()
    for (const v of vs) {
      v.currentZoneId = getZoneAt(v.position.x, v.position.y)?.id ?? 'village_square'
      this.villagers.set(v.id, v)
    }

    const os = loadAllObjects()
    for (const o of os) {
      this.objects.set(o.id, o)
    }

    console.log(`[World] Loaded ${vs.length} villagers, ${os.length} objects`)
  }

  snapshot(): WorldState {
    return {
      tick: this.clock.tick,
      gameTime: this.clock.gameTime,
      villagers: [...this.villagers.values()],
      objects: [...this.objects.values()],
      zones: ZONES,
    }
  }

  getVillager(id: string): Villager | undefined {
    return this.villagers.get(id)
  }

  getAllVillagers(): Villager[] {
    return [...this.villagers.values()]
  }

  /**
   * Main tick. Returns patches and events to broadcast.
   */
  tick(): {
    patches: EntityPatch[]
    speeches: Array<{ speakerId: string; targetId: string | 'broadcast'; text: string }>
    perceptions: Map<string, PerceptionEvent[]>
    phaseChanged: boolean
    newPhase: TimePhase | null
  } {
    const { phaseChanged, newPhase } = this.clock.advance()
    const patches: EntityPatch[] = []

    // Fire phase change events
    if (phaseChanged && newPhase) {
      for (const v of this.villagers.values()) {
        this.addPerception(v.id, { kind: 'TIME_PHASE', phase: newPhase })
      }
      logEvent(this.clock.tick, this.clock.timeString, 'TIME_PHASE_CHANGED', { phase: newPhase })
    }

    // Process waits
    for (const [id, ticks] of this.waitCounters) {
      if (ticks <= 1) {
        this.waitCounters.delete(id)
      } else {
        this.waitCounters.set(id, ticks - 1)
      }
    }

    // Process movement
    for (const [id, path] of this.movePaths) {
      if (path.length === 0) {
        this.movePaths.delete(id)
        const v = this.villagers.get(id)
        if (v) {
          v.animation = 'idle'
          patches.push({ id, animation: 'idle' })
        }
        continue
      }

      const v = this.villagers.get(id)
      if (!v) continue

      const next = path[0]!
      const dx = next.x - v.position.x
      const dy = next.y - v.position.y

      if (dx === 0 && dy === 0) {
        path.shift()
        continue
      }

      // Step toward next waypoint
      const stepX = dx !== 0 ? Math.sign(dx) : 0
      const stepY = dy !== 0 ? (dx === 0 ? Math.sign(dy) : 0) : 0

      const newX = Math.max(0, Math.min(MAP_SIZE - 1, v.position.x + stepX))
      const newY = Math.max(0, Math.min(MAP_SIZE - 1, v.position.y + stepY))

      const oldZone = v.currentZoneId
      v.position = { x: newX, y: newY }
      v.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'
      v.animation = 'walk'

      const newZone = getZoneAt(newX, newY)?.id ?? v.currentZoneId
      if (newZone !== oldZone) {
        v.currentZoneId = newZone
        // Notify all villagers in affected zones
        for (const other of this.villagers.values()) {
          if (other.id !== id) {
            if (other.currentZoneId === newZone) {
              this.addPerception(other.id, { kind: 'ENTITY_ENTERED', entityId: id, zoneId: newZone })
            }
            if (other.currentZoneId === oldZone) {
              this.addPerception(other.id, { kind: 'ENTITY_LEFT', entityId: id, zoneId: oldZone })
            }
          }
        }
      }

      // Arrived at waypoint?
      if (newX === next.x && newY === next.y) {
        path.shift()
      }

      patches.push({ id, position: v.position, facing: v.facing, animation: v.animation, currentZoneId: v.currentZoneId })

      // Persist position every 10 ticks
      if (this.clock.tick % 10 === 0) {
        saveVillagerPosition(id, v.position)
      }
    }

    // Server-controlled AI: follow schedule
    for (const v of this.villagers.values()) {
      if (v.controlledBy !== 'server') continue
      if (this.movePaths.has(v.id)) continue
      if (this.waitCounters.has(v.id)) continue

      // Every ~5 seconds (25 ticks), decide if should move toward schedule zone
      if (this.clock.tick % 25 !== parseInt(v.id.slice(1)) % 25) continue

      const targetZoneId = v.schedule[this.clock.phase]
      if (!targetZoneId) continue
      if (v.currentZoneId === targetZoneId) {
        // Already in right zone; idle around
        this.scheduleIdleWander(v)
        continue
      }

      const zone = ZONE_MAP.get(targetZoneId)
      if (!zone) continue

      const targetX = zone.bounds.x + Math.floor(zone.bounds.width / 2)
      const targetY = zone.bounds.y + Math.floor(zone.bounds.height / 2)
      this.movePaths.set(v.id, [{ x: targetX, y: targetY }])
    }

    const speeches = this.pendingSpeeches.splice(0)
    const perceptions = new Map(this.pendingPerceptions)
    this.pendingPerceptions.clear()

    return { patches, speeches, perceptions, phaseChanged, newPhase }
  }

  private scheduleIdleWander(v: Villager): void {
    const zone = ZONE_MAP.get(v.currentZoneId)
    if (!zone) return
    const tx = zone.bounds.x + Math.floor(Math.random() * zone.bounds.width)
    const ty = zone.bounds.y + Math.floor(Math.random() * zone.bounds.height)
    if (Math.abs(tx - v.position.x) + Math.abs(ty - v.position.y) < 2) return
    this.movePaths.set(v.id, [{ x: tx, y: ty }])
  }

  // ─── Action handling ──────────────────────────────────────────────────────────

  applyAction(villagerIdActing: string, action: VillagerAction): boolean {
    const v = this.villagers.get(villagerIdActing)
    if (!v) return false

    switch (action.kind) {
      case 'MOVE': {
        this.movePaths.set(villagerIdActing, [...action.path])
        this.waitCounters.delete(villagerIdActing)
        return true
      }

      case 'WAIT': {
        this.waitCounters.set(villagerIdActing, action.durationTicks)
        this.movePaths.delete(villagerIdActing)
        return true
      }

      case 'SPEAK': {
        const text = action.text.slice(0, 500)
        this.pendingSpeeches.push({ speakerId: villagerIdActing, targetId: action.targetId, text })

        // Distribute perceptions to nearby villagers
        for (const other of this.villagers.values()) {
          if (other.id === villagerIdActing) continue
          const dx = other.position.x - v.position.x
          const dy = other.position.y - v.position.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= 8) {
            if (action.targetId === other.id) {
              this.addPerception(other.id, { kind: 'ADDRESSED', speakerId: villagerIdActing, text })
            } else {
              this.addPerception(other.id, { kind: 'NEARBY_SPEECH', speakerId: villagerIdActing, text, distance: dist })
            }
          }
        }

        logEvent(this.clock.tick, this.clock.timeString, 'SPEECH', {
          speakerId: villagerIdActing, targetId: action.targetId, text
        })
        return true
      }

      case 'INTERACT': {
        const obj = this.objects.get(action.objectId)
        if (!obj) return false
        const dx = obj.position.x - v.position.x
        const dy = obj.position.y - v.position.y
        if (Math.abs(dx) + Math.abs(dy) > obj.interactRange + 1) return false

        this.handleInteract(v, obj)
        return true
      }

      case 'EMOTE': {
        if (action.emote === 'sleep') {
          v.animation = 'sleep'
        } else if (action.emote === 'work') {
          v.animation = 'work'
        } else {
          v.animation = 'idle'
        }
        return true
      }

      case 'POSSESS': {
        // Handled by WS layer
        return true
      }
    }
  }

  private handleInteract(villager: Villager, obj: WorldObject): void {
    switch (obj.type) {
      case 'door': {
        const state = obj.state as { open: boolean }
        obj.state = { open: !state.open }
        break
      }
      case 'chest': {
        const state = obj.state as { open: boolean }
        obj.state = { ...state, open: !state.open }
        break
      }
      case 'crop': {
        const state = obj.state as { ripe: boolean; type: string }
        if (state.ripe) {
          obj.state = { ...state, ripe: false }
          logEvent(this.clock.tick, this.clock.timeString, 'HARVEST', {
            villagerId: villager.id, cropType: state.type
          })
        }
        break
      }
      case 'firepit': {
        const state = obj.state as { lit: boolean }
        obj.state = { lit: !state.lit }
        break
      }
      case 'well': {
        logEvent(this.clock.tick, this.clock.timeString, 'WELL_USE', { villagerId: villager.id })
        break
      }
      default: break
    }

    // Notify nearby villagers
    for (const other of this.villagers.values()) {
      const dx = other.position.x - obj.position.x
      const dy = other.position.y - obj.position.y
      if (Math.sqrt(dx * dx + dy * dy) <= 5) {
        this.addPerception(other.id, { kind: 'OBJECT_CHANGED', objectId: obj.id, newState: obj.state })
      }
    }

    saveObjectState(obj.id, obj.state as Record<string, unknown>)
  }

  setVillagerController(id: string, controller: Villager['controlledBy'], agentConnected?: boolean): void {
    const v = this.villagers.get(id)
    if (!v) return
    v.controlledBy = controller
    if (agentConnected !== undefined) v.agentConnected = agentConnected
  }

  private addPerception(villagerId: string, event: PerceptionEvent): void {
    if (!this.pendingPerceptions.has(villagerId)) {
      this.pendingPerceptions.set(villagerId, [])
    }
    this.pendingPerceptions.get(villagerId)!.push(event)
  }
}
