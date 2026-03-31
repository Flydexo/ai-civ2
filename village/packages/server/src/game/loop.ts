import type { WebSocketServer } from 'ws'
import type WebSocket from 'ws'
import { WorldState_ } from './world.js'
import type { WorldDeltaMessage, AgentPerceptionMessage, WorldEventMessage } from '@village/shared'

const TICK_MS = 200

export class GameLoop {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private world: WorldState_,
    private wss: WebSocketServer,
    // Maps client ws → { clientType, villagerIdToControl }
    private clients: Map<WebSocket, { clientType: string; villagerIdToControl?: string }>
  ) {}

  start(): void {
    this.timer = setInterval(() => this.tick(), TICK_MS)
    console.log(`[Loop] Started at ${TICK_MS}ms per tick`)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private tick(): void {
    const { patches, speeches, perceptions, phaseChanged, newPhase } = this.world.tick()

    const deltaMsg: WorldDeltaMessage = {
      type: 'WORLD_DELTA',
      tick: this.world.clock.tick,
      gameTime: this.world.clock.timeString,
      entities: patches,
      speeches,
    }

    const deltaJson = JSON.stringify(deltaMsg)

    // Broadcast delta to all connected clients
    for (const [ws, info] of this.clients) {
      if (ws.readyState !== ws.OPEN) continue
      ws.send(deltaJson)

      // Send perceptions to agents
      if (info.clientType === 'agent' && info.villagerIdToControl) {
        const events = perceptions.get(info.villagerIdToControl)
        if (events && events.length > 0) {
          const percMsg: AgentPerceptionMessage = {
            type: 'AGENT_PERCEPTION',
            villagerIdAffected: info.villagerIdToControl,
            events,
          }
          ws.send(JSON.stringify(percMsg))
        }
      }
    }

    // Broadcast phase change as world event
    if (phaseChanged && newPhase) {
      const eventMsg: WorldEventMessage = {
        type: 'WORLD_EVENT',
        event: { kind: 'TIME_PHASE_CHANGED', phase: newPhase },
      }
      const eventJson = JSON.stringify(eventMsg)
      for (const [ws] of this.clients) {
        if (ws.readyState === ws.OPEN) ws.send(eventJson)
      }
    }
  }
}
