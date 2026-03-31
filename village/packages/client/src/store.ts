import type { Villager, WorldObject, Zone, GameTime, EntityPatch } from '@village/shared'

export interface SpeechBubble {
  speakerId: string
  text: string
  expiresAt: number  // Date.now() + 4000
}

export class WorldStore {
  villagers = new Map<string, Villager>()
  objects = new Map<string, WorldObject>()
  zones: Zone[] = []
  gameTime: GameTime = { hour: 7, minute: 0, phase: 'morning', tick: 0 }
  currentTick = 0
  speeches: SpeechBubble[] = []
  possessedVillagerId: string | null = null

  applySnapshot(state: { villagers: Villager[]; objects: WorldObject[]; zones: Zone[]; gameTime: GameTime; tick: number }): void {
    this.villagers.clear()
    for (const v of state.villagers) this.villagers.set(v.id, v)
    this.objects.clear()
    for (const o of state.objects) this.objects.set(o.id, o)
    this.zones = state.zones
    this.gameTime = state.gameTime
    this.currentTick = state.tick
  }

  applyDelta(tick: number, gameTimeStr: string, patches: EntityPatch[], speeches: Array<{ speakerId: string; targetId: string | 'broadcast'; text: string }>): void {
    this.currentTick = tick

    const [h, m] = gameTimeStr.split(':').map(Number)
    if (h !== undefined) this.gameTime.hour = h
    if (m !== undefined) this.gameTime.minute = m

    for (const patch of patches) {
      const v = this.villagers.get(patch.id)
      if (!v) continue
      if (patch.position !== undefined) v.position = patch.position
      if (patch.facing !== undefined) v.facing = patch.facing
      if (patch.animation !== undefined) v.animation = patch.animation
      if (patch.currentZoneId !== undefined) v.currentZoneId = patch.currentZoneId
      if (patch.controlledBy !== undefined) v.controlledBy = patch.controlledBy
      if (patch.agentConnected !== undefined) v.agentConnected = patch.agentConnected
    }

    for (const s of speeches) {
      this.speeches.push({
        speakerId: s.speakerId,
        text: s.text,
        expiresAt: Date.now() + 4000,
      })
    }

    // Purge expired speeches
    const now = Date.now()
    this.speeches = this.speeches.filter(s => s.expiresAt > now)
  }
}
