import type WebSocket from 'ws'
import type { WebSocketServer } from 'ws'
import type { ClientMessage, ActionMessage } from '@village/shared'
import { WorldState_ } from '../game/world.js'

export interface ClientInfo {
  clientType: 'viewer' | 'agent'
  villagerIdToControl?: string
}

export function setupWsHandlers(
  wss: WebSocketServer,
  world: WorldState_,
  clients: Map<WebSocket, ClientInfo>
): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] New connection')

    // Temporary state before HELLO
    let initialized = false

    ws.on('message', (data) => {
      let msg: ClientMessage
      try {
        msg = JSON.parse(data.toString()) as ClientMessage
      } catch {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }))
        return
      }

      if (!initialized) {
        if (msg.type !== 'HELLO') {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Expected HELLO' }))
          return
        }

        const info: ClientInfo = {
          clientType: msg.clientType,
          villagerIdToControl: msg.villagerIdToControl,
        }
        clients.set(ws, info)
        initialized = true

        // Assign control
        if (msg.villagerIdToControl) {
          const controller = msg.clientType === 'agent' ? 'agent' : 'human'
          world.setVillagerController(
            msg.villagerIdToControl,
            controller,
            msg.clientType === 'agent' ? true : undefined
          )
        }

        // Send world snapshot
        ws.send(JSON.stringify({ type: 'WORLD_SNAPSHOT', state: world.snapshot() }))
        console.log(`[WS] ${msg.clientType} connected, controlling: ${msg.villagerIdToControl ?? 'none'}`)
        return
      }

      if (msg.type === 'ACTION') {
        const actionMsg = msg as ActionMessage
        const info = clients.get(ws)

        // Verify the client is allowed to control this villager
        if (info?.villagerIdToControl && info.villagerIdToControl !== actionMsg.villagerIdActing) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Not authorized to control this villager' }))
          return
        }

        const ok = world.applyAction(actionMsg.villagerIdActing, actionMsg.action)
        if (!ok) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Action failed' }))
        }
      }
    })

    ws.on('close', () => {
      const info = clients.get(ws)
      if (info?.villagerIdToControl) {
        world.setVillagerController(info.villagerIdToControl, 'server', false)
        console.log(`[WS] Released control of ${info.villagerIdToControl}`)
      }
      clients.delete(ws)
      console.log('[WS] Connection closed')
    })

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message)
    })
  })
}
