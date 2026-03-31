import { Router } from 'express'
import { WorldState_ } from '../game/world.js'
import { getRecentEvents } from '../db/repo.js'

export function createApiRouter(world: WorldState_): Router {
  const router = Router()

  router.get('/state', (_req, res) => {
    res.json(world.snapshot())
  })

  router.get('/villagers', (_req, res) => {
    res.json(world.getAllVillagers())
  })

  router.get('/time', (_req, res) => {
    res.json(world.clock.gameTime)
  })

  router.get('/events', (_req, res) => {
    const limit = Math.min(Number(_req.query.limit) || 50, 200)
    res.json(getRecentEvents(limit))
  })

  return router
}
