import Phaser from 'phaser'
import { VillageWsClient } from '../ws-client.js'
import { WorldStore } from '../store.js'

const TILE_SIZE = 16
const MAP_TILES = 40
const WORLD_PX = TILE_SIZE * MAP_TILES  // 640

export class BootScene extends Phaser.Scene {
  private ws!: VillageWsClient
  private store!: WorldStore

  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    // Show loading text
    const cx = this.cameras.main.width / 2
    const cy = this.cameras.main.height / 2
    this.add.text(cx, cy, 'Connecting to server...', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5)

    // Create procedural textures (no external assets needed)
    this.createTextures()
  }

  private createTextures(): void {
    // Ground tile (grass green)
    const groundGfx = this.make.graphics({ x: 0, y: 0 })
    groundGfx.fillStyle(0x4a7c59)
    groundGfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
    groundGfx.lineStyle(1, 0x3d6648, 0.3)
    groundGfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE)
    groundGfx.generateTexture('tile_ground', TILE_SIZE, TILE_SIZE)
    groundGfx.destroy()

    // Path tile (dirt)
    const pathGfx = this.make.graphics({ x: 0, y: 0 })
    pathGfx.fillStyle(0xb8860b)
    pathGfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
    pathGfx.generateTexture('tile_path', TILE_SIZE, TILE_SIZE)
    pathGfx.destroy()

    // Water tile
    const waterGfx = this.make.graphics({ x: 0, y: 0 })
    waterGfx.fillStyle(0x1e6bbf)
    waterGfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
    waterGfx.generateTexture('tile_water', TILE_SIZE, TILE_SIZE)
    waterGfx.destroy()

    // Villager sprites (colored circles per role)
    const roleColors: Record<string, number> = {
      blacksmith: 0x8b4513,
      farmer: 0x228b22,
      innkeeper: 0xdaa520,
      priest: 0xf5f5f5,
      herbalist: 0x90ee90,
      merchant: 0x9370db,
      child: 0xff69b4,
      elder: 0xd3d3d3,
    }

    for (const [role, color] of Object.entries(roleColors)) {
      const g = this.make.graphics({ x: 0, y: 0 })
      // Body
      g.fillStyle(color)
      g.fillCircle(8, 8, 7)
      // Outline
      g.lineStyle(1, 0x000000, 0.8)
      g.strokeCircle(8, 8, 7)
      // Eyes
      g.fillStyle(0x000000)
      g.fillCircle(6, 6, 1)
      g.fillCircle(10, 6, 1)
      g.generateTexture(`villager_${role}`, 16, 16)
      g.destroy()
    }

    // Default villager
    const defG = this.make.graphics({ x: 0, y: 0 })
    defG.fillStyle(0xaaaaaa)
    defG.fillCircle(8, 8, 7)
    defG.generateTexture('villager_default', 16, 16)
    defG.destroy()

    // Objects
    const objDefs: Array<{ key: string; color: number; shape: 'rect' | 'circle' }> = [
      { key: 'obj_well',     color: 0x708090, shape: 'circle' },
      { key: 'obj_firepit',  color: 0xff4500, shape: 'circle' },
      { key: 'obj_crop',     color: 0xadff2f, shape: 'rect' },
      { key: 'obj_chest',    color: 0xcd853f, shape: 'rect' },
      { key: 'obj_door',     color: 0x8b4513, shape: 'rect' },
      { key: 'obj_bed',      color: 0x4169e1, shape: 'rect' },
      { key: 'obj_sign',     color: 0xf5deb3, shape: 'rect' },
    ]

    for (const def of objDefs) {
      const g = this.make.graphics({ x: 0, y: 0 })
      g.fillStyle(def.color)
      if (def.shape === 'circle') {
        g.fillCircle(8, 8, 6)
      } else {
        g.fillRect(2, 2, 12, 12)
      }
      g.lineStyle(1, 0x000000, 0.6)
      if (def.shape === 'circle') g.strokeCircle(8, 8, 6)
      else g.strokeRect(2, 2, 12, 12)
      g.generateTexture(def.key, 16, 16)
      g.destroy()
    }

    // Crown (possession indicator)
    const crownG = this.make.graphics({ x: 0, y: 0 })
    crownG.fillStyle(0xffd700)
    crownG.fillTriangle(2, 10, 8, 2, 14, 10)
    crownG.fillRect(2, 10, 12, 4)
    crownG.generateTexture('crown', 16, 14)
    crownG.destroy()
  }

  async create(): Promise<void> {
    const wsUrl = `ws://${window.location.hostname}:${window.location.port || '3001'}/ws`
    const ws = new VillageWsClient(wsUrl)
    const store = new WorldStore()

    try {
      await ws.connect()
      ws.send({ type: 'HELLO', clientType: 'viewer' })

      // Wait for snapshot
      await new Promise<void>((resolve) => {
        ws.onMessage((msg) => {
          if (msg.type === 'WORLD_SNAPSHOT') {
            store.applySnapshot(msg.state)
            resolve()
          }
        })
      })

      this.scene.start('GameScene', { ws, store })
    } catch (e) {
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 30,
        'Failed to connect. Is the server running?\nhttp://localhost:3001',
        { fontSize: '13px', color: '#ff4444', fontFamily: 'monospace', align: 'center' }
      ).setOrigin(0.5)
    }
  }
}
