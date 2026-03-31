import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import type WebSocket from 'ws'
import { initDb } from './db/database.js'
import { WorldState_ } from './game/world.js'
import { GameLoop } from './game/loop.js'
import { setupWsHandlers, type ClientInfo } from './ws/handler.js'
import { createApiRouter } from './routes/api.js'

const PORT = Number(process.env.PORT ?? 3001)

// ─── Bootstrap ────────────────────────────────────────────────────────────────

initDb()

const world = new WorldState_()
world.load()

const app = express()
app.use(express.json())

// CORS for local dev
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// Static client build (production)
app.use(express.static('../client/dist'))

// REST API
app.use('/api', createApiRouter(world))

// ─── HTTP + WS Server ─────────────────────────────────────────────────────────

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const clients = new Map<WebSocket, ClientInfo>()
setupWsHandlers(wss, world, clients)

// ─── Game Loop ────────────────────────────────────────────────────────────────

const loop = new GameLoop(world, wss, clients)
loop.start()

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`)
  console.log(`[Server] WebSocket on ws://localhost:${PORT}/ws`)
})

process.on('SIGTERM', () => {
  loop.stop()
  server.close()
})
