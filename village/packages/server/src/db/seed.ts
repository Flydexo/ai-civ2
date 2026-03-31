import { initDb, getDb } from './database.js'

initDb()

const db = getDb()

// ─── Villagers ────────────────────────────────────────────────────────────────

const villagers = [
  {
    id: 'v1', name: 'Aldric', role: 'blacksmith',
    position_x: 33, position_y: 3,
    schedule: JSON.stringify({ morning: 'blacksmith', evening: 'tavern', night: 'home_ne' }),
  },
  {
    id: 'v2', name: 'Maren', role: 'farmer',
    position_x: 5, position_y: 31,
    schedule: JSON.stringify({ dawn: 'farm', morning: 'farm', afternoon: 'village_square', night: 'home_sw' }),
  },
  {
    id: 'v3', name: 'Sable', role: 'innkeeper',
    position_x: 4, position_y: 3,
    schedule: JSON.stringify({ morning: 'tavern', afternoon: 'tavern', evening: 'tavern', night: 'tavern' }),
  },
  {
    id: 'v4', name: 'Finn', role: 'priest',
    position_x: 19, position_y: 4,
    schedule: JSON.stringify({ dawn: 'church', morning: 'church', afternoon: 'village_square', night: 'home_n' }),
  },
  {
    id: 'v5', name: 'Lyra', role: 'herbalist',
    position_x: 35, position_y: 35,
    schedule: JSON.stringify({ morning: 'forest_edge', afternoon: 'home_se', evening: 'home_se', night: 'home_se' }),
  },
  {
    id: 'v6', name: 'Otto', role: 'merchant',
    position_x: 2, position_y: 9,
    schedule: JSON.stringify({ morning: 'village_square', afternoon: 'tavern', evening: 'tavern', night: 'home_nw' }),
  },
  {
    id: 'v7', name: 'Wren', role: 'child',
    position_x: 3, position_y: 9,
    schedule: JSON.stringify({ morning: 'village_square', afternoon: 'farm', evening: 'home_nw', night: 'home_nw' }),
  },
  {
    id: 'v8', name: 'Edda', role: 'elder',
    position_x: 25, position_y: 2,
    schedule: JSON.stringify({ dawn: 'church', morning: 'church', evening: 'village_square', night: 'home_n' }),
  },
]

const insertVillager = db.prepare(`
  INSERT OR REPLACE INTO villagers (id, name, role, position_x, position_y, schedule, memory)
  VALUES (@id, @name, @role, @position_x, @position_y, @schedule, '{}')
`)

for (const v of villagers) {
  insertVillager.run(v)
}
console.log(`[Seed] Inserted ${villagers.length} villagers`)

// ─── World Objects ─────────────────────────────────────────────────────────────

const objects = [
  { id: 'well_1',    type: 'well',    position_x: 19, position_y: 19, zone_id: 'village_square', state: '{}' },
  { id: 'firepit_1', type: 'firepit', position_x: 21, position_y: 21, zone_id: 'village_square', state: JSON.stringify({ lit: false }) },
  { id: 'crop_1',    type: 'crop',    position_x: 3,  position_y: 29, zone_id: 'farm',           state: JSON.stringify({ ripe: false, type: 'wheat' }) },
  { id: 'crop_2',    type: 'crop',    position_x: 5,  position_y: 29, zone_id: 'farm',           state: JSON.stringify({ ripe: false, type: 'carrot' }) },
  { id: 'crop_3',    type: 'crop',    position_x: 7,  position_y: 29, zone_id: 'farm',           state: JSON.stringify({ ripe: true,  type: 'wheat' }) },
  { id: 'chest_bs',  type: 'chest',   position_x: 32, position_y: 2,  zone_id: 'blacksmith',     state: JSON.stringify({ open: false, items: [] }) },
  { id: 'door_tv',   type: 'door',    position_x: 4,  position_y: 6,  zone_id: 'tavern',         state: JSON.stringify({ open: false }) },
  { id: 'sign_sq',   type: 'sign',    position_x: 20, position_y: 16, zone_id: 'village_square', state: JSON.stringify({ text: 'Welcome to the Village!' }) },
  { id: 'bed_inn',   type: 'bed',     position_x: 3,  position_y: 2,  zone_id: 'tavern',         state: JSON.stringify({ occupied: false }) },
]

const insertObject = db.prepare(`
  INSERT OR REPLACE INTO world_objects (id, type, position_x, position_y, zone_id, state)
  VALUES (@id, @type, @position_x, @position_y, @zone_id, @state)
`)

for (const o of objects) {
  insertObject.run(o)
}
console.log(`[Seed] Inserted ${objects.length} world objects`)
console.log('[Seed] Done')
