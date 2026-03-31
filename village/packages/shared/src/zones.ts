import type { Zone } from './types.js'

// Map is 40×40 tiles. Zones are defined in tile coordinates.
export const ZONES: Zone[] = [
  {
    id: 'village_square',
    label: 'Village Square',
    bounds: { x: 15, y: 15, width: 10, height: 10 },
    capacity: 20,
  },
  {
    id: 'tavern',
    label: 'Tavern',
    bounds: { x: 1, y: 1, width: 8, height: 6 },
    capacity: 10,
  },
  {
    id: 'farm',
    label: 'Farm',
    bounds: { x: 1, y: 28, width: 12, height: 8 },
    capacity: 6,
  },
  {
    id: 'blacksmith',
    label: 'Blacksmith',
    bounds: { x: 31, y: 1, width: 6, height: 6 },
    capacity: 4,
  },
  {
    id: 'church',
    label: 'Church',
    bounds: { x: 16, y: 1, width: 6, height: 8 },
    capacity: 8,
  },
  {
    id: 'forest_edge',
    label: 'Forest Edge',
    bounds: { x: 30, y: 28, width: 8, height: 8 },
    capacity: 6,
  },
  {
    id: 'home_ne',
    label: 'Home (NE)',
    bounds: { x: 34, y: 8, width: 4, height: 4 },
    capacity: 4,
  },
  {
    id: 'home_sw',
    label: 'Home (SW)',
    bounds: { x: 1, y: 34, width: 4, height: 4 },
    capacity: 4,
  },
  {
    id: 'home_nw',
    label: 'Home (NW)',
    bounds: { x: 1, y: 8, width: 4, height: 4 },
    capacity: 4,
  },
  {
    id: 'home_n',
    label: 'Home (N)',
    bounds: { x: 24, y: 1, width: 4, height: 4 },
    capacity: 4,
  },
  {
    id: 'home_se',
    label: 'Home (SE)',
    bounds: { x: 34, y: 34, width: 4, height: 4 },
    capacity: 4,
  },
]

export const ZONE_MAP = new Map(ZONES.map(z => [z.id, z]))

export function getZoneAt(x: number, y: number): Zone | undefined {
  return ZONES.find(z =>
    x >= z.bounds.x &&
    x < z.bounds.x + z.bounds.width &&
    y >= z.bounds.y &&
    y < z.bounds.y + z.bounds.height
  )
}
