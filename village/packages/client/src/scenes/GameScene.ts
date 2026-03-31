import Phaser from 'phaser'
import { ZONES } from '@village/shared'
import type { Villager, WorldObject, TilePos } from '@village/shared'
import { VillageWsClient } from '../ws-client.js'
import { WorldStore } from '../store.js'

const TILE = 16
const MAP_TILES = 40
const WORLD_PX = TILE * MAP_TILES

// Zone colors for ground rendering
const ZONE_COLORS: Record<string, number> = {
  village_square: 0x6b8e6b,
  tavern:         0x8b7355,
  farm:           0x7a9e4e,
  blacksmith:     0x696969,
  church:         0xe8e8d0,
  forest_edge:    0x2e5e2e,
  home_ne:        0x9b7b6b,
  home_sw:        0x9b7b6b,
  home_nw:        0x9b7b6b,
  home_n:         0x9b7b6b,
  home_se:        0x9b7b6b,
}

interface SpriteEntry {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  bubble: Phaser.GameObjects.Container | null
  crown: Phaser.GameObjects.Image | null
  targetX: number
  targetY: number
}

export class GameScene extends Phaser.Scene {
  private ws!: VillageWsClient
  private store!: WorldStore

  private villagerSprites = new Map<string, SpriteEntry>()
  private objectSprites = new Map<string, Phaser.GameObjects.Image>()

  private groundLayer!: Phaser.GameObjects.Container
  private objectLayer!: Phaser.GameObjects.Container
  private villagerLayer!: Phaser.GameObjects.Container
  private bubbleLayer!: Phaser.GameObjects.Container

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private eKey!: Phaser.Input.Keyboard.Key
  private tKey!: Phaser.Input.Keyboard.Key

  private chatInput: HTMLInputElement | null = null
  private chatActive = false

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { ws: VillageWsClient; store: WorldStore }): void {
    this.ws = data.ws
    this.store = data.store
  }

  create(): void {
    // Layers
    this.groundLayer = this.add.container(0, 0)
    this.objectLayer = this.add.container(0, 0)
    this.villagerLayer = this.add.container(0, 0)
    this.bubbleLayer = this.add.container(0, 0)

    this.buildGround()
    this.buildObjects()
    this.buildVillagers()

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_PX, WORLD_PX)
    this.cameras.main.setZoom(2)
    this.cameras.main.centerOn(WORLD_PX / 2, WORLD_PX / 2)

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.tKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T)

    // WS handler for deltas
    this.ws.onMessage((msg) => {
      if (msg.type === 'WORLD_DELTA') {
        this.store.applyDelta(msg.tick, msg.gameTime, msg.entities, msg.speeches)
        this.syncSprites()
        this.updateBubbles()
      }
    })

    // Start UI scene in parallel
    this.scene.launch('UIScene', { ws: this.ws, store: this.store })
    this.scene.launch('DashboardScene', { ws: this.ws, store: this.store })
  }

  private buildGround(): void {
    // Fill with base grass
    for (let tx = 0; tx < MAP_TILES; tx++) {
      for (let ty = 0; ty < MAP_TILES; ty++) {
        const img = this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 'tile_ground')
        img.setDisplaySize(TILE, TILE)
        this.groundLayer.add(img)
      }
    }

    // Paint zones with their colors
    for (const zone of ZONES) {
      const color = ZONE_COLORS[zone.id] ?? 0x557755
      const gfx = this.add.graphics()
      gfx.fillStyle(color, 0.6)
      gfx.fillRect(
        zone.bounds.x * TILE,
        zone.bounds.y * TILE,
        zone.bounds.width * TILE,
        zone.bounds.height * TILE
      )
      gfx.lineStyle(1, 0x000000, 0.2)
      gfx.strokeRect(
        zone.bounds.x * TILE,
        zone.bounds.y * TILE,
        zone.bounds.width * TILE,
        zone.bounds.height * TILE
      )
      this.groundLayer.add(gfx)

      // Zone label
      const label = this.add.text(
        zone.bounds.x * TILE + 2,
        zone.bounds.y * TILE + 2,
        zone.label,
        { fontSize: '5px', color: '#ffffff', fontFamily: 'monospace', alpha: 0.7 }
      )
      this.groundLayer.add(label)
    }
  }

  private buildObjects(): void {
    for (const obj of this.store.objects.values()) {
      this.addObjectSprite(obj)
    }
  }

  private addObjectSprite(obj: WorldObject): void {
    const texKey = `obj_${obj.type}`
    const img = this.add.image(
      obj.position.x * TILE + TILE / 2,
      obj.position.y * TILE + TILE / 2,
      texKey
    )
    img.setDisplaySize(TILE, TILE)
    img.setInteractive()
    img.on('pointerdown', () => this.handleObjectClick(obj.id))
    this.objectLayer.add(img)
    this.objectSprites.set(obj.id, img)
  }

  private buildVillagers(): void {
    for (const v of this.store.villagers.values()) {
      this.addVillagerSprite(v)
    }
  }

  private addVillagerSprite(v: Villager): void {
    const texKey = `villager_${v.role}`
    const sprite = this.add.image(
      v.position.x * TILE + TILE / 2,
      v.position.y * TILE + TILE / 2,
      texKey
    )
    sprite.setDisplaySize(TILE, TILE)
    sprite.setInteractive()
    sprite.on('pointerdown', () => this.handleVillagerClick(v.id))

    const label = this.add.text(
      v.position.x * TILE + TILE / 2,
      v.position.y * TILE - 2,
      v.name,
      { fontSize: '4px', color: '#ffffff', fontFamily: 'monospace', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(0.5, 1)

    const entry: SpriteEntry = {
      sprite,
      label,
      bubble: null,
      crown: null,
      targetX: v.position.x * TILE + TILE / 2,
      targetY: v.position.y * TILE + TILE / 2,
    }

    this.villagerLayer.add(sprite)
    this.villagerLayer.add(label)
    this.villagerSprites.set(v.id, entry)
  }

  private syncSprites(): void {
    for (const v of this.store.villagers.values()) {
      const entry = this.villagerSprites.get(v.id)
      if (!entry) continue

      entry.targetX = v.position.x * TILE + TILE / 2
      entry.targetY = v.position.y * TILE + TILE / 2

      // Possessed indicator
      const isPossessed = this.store.possessedVillagerId === v.id
      if (isPossessed && !entry.crown) {
        const crown = this.add.image(entry.targetX, entry.targetY - TILE, 'crown')
        crown.setDisplaySize(10, 8)
        this.villagerLayer.add(crown)
        entry.crown = crown
      } else if (!isPossessed && entry.crown) {
        entry.crown.destroy()
        entry.crown = null
      }
    }
  }

  private updateBubbles(): void {
    // Clear old bubble containers
    this.bubbleLayer.removeAll(true)

    const now = Date.now()
    for (const speech of this.store.speeches) {
      if (speech.expiresAt <= now) continue

      const v = this.store.villagers.get(speech.speakerId)
      if (!v) continue

      const px = v.position.x * TILE + TILE / 2
      const py = v.position.y * TILE - 4

      const text = this.add.text(0, 0, speech.text, {
        fontSize: '5px',
        color: '#000000',
        fontFamily: 'monospace',
        wordWrap: { width: 80 },
        padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 1)

      const bg = this.add.graphics()
      const tw = text.width + 4
      const th = text.height + 4
      bg.fillStyle(0xffffff, 0.92)
      bg.fillRoundedRect(-tw / 2 - 2, -th - 2, tw + 4, th + 4, 3)
      bg.lineStyle(1, 0x333333, 0.8)
      bg.strokeRoundedRect(-tw / 2 - 2, -th - 2, tw + 4, th + 4, 3)

      const container = this.add.container(px, py, [bg, text])
      this.bubbleLayer.add(container)
    }
  }

  override update(_time: number, _delta: number): void {
    if (this.chatActive) return

    const possessed = this.store.possessedVillagerId
    if (!possessed) {
      // Free camera movement
      const speed = 2
      if (this.cursors.left.isDown || this.wasd.left.isDown) {
        this.cameras.main.scrollX -= speed
      } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
        this.cameras.main.scrollX += speed
      }
      if (this.cursors.up.isDown || this.wasd.up.isDown) {
        this.cameras.main.scrollY -= speed
      } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
        this.cameras.main.scrollY += speed
      }
      return
    }

    // Possessed: WASD moves villager
    const v = this.store.villagers.get(possessed)
    if (!v) return

    let moved = false
    let nx = v.position.x
    let ny = v.position.y

    if (Phaser.Input.Keyboard.JustDown(this.wasd.up) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      ny--; moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.down) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      ny++; moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.left) || Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      nx--; moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.right) || Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      nx++; moved = true
    }

    if (moved) {
      nx = Math.max(0, Math.min(MAP_TILES - 1, nx))
      ny = Math.max(0, Math.min(MAP_TILES - 1, ny))
      this.ws.send({
        type: 'ACTION',
        villagerIdActing: possessed,
        action: { kind: 'MOVE', path: [{ x: nx, y: ny }] },
      })
    }

    // E = interact
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.tryInteract(v)
    }

    // T = chat
    if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
      this.openChat()
    }

    // Follow possessed villager
    const entry = this.villagerSprites.get(possessed)
    if (entry) {
      this.cameras.main.centerOn(entry.sprite.x, entry.sprite.y)
    }

    // Smooth sprite positions (lerp)
    for (const [id, entry] of this.villagerSprites) {
      const lerpFactor = 0.15
      entry.sprite.x = Phaser.Math.Linear(entry.sprite.x, entry.targetX, lerpFactor)
      entry.sprite.y = Phaser.Math.Linear(entry.sprite.y, entry.targetY, lerpFactor)
      entry.label.x = entry.sprite.x
      entry.label.y = entry.sprite.y - TILE / 2 - 1
      if (entry.crown) {
        entry.crown.x = entry.sprite.x
        entry.crown.y = entry.sprite.y - TILE
      }
      void id
    }
  }

  private tryInteract(v: Villager): void {
    for (const obj of this.store.objects.values()) {
      const dx = Math.abs(obj.position.x - v.position.x)
      const dy = Math.abs(obj.position.y - v.position.y)
      if (dx + dy <= 2) {
        this.ws.send({
          type: 'ACTION',
          villagerIdActing: v.id,
          action: { kind: 'INTERACT', objectId: obj.id },
        })
        break
      }
    }
  }

  private handleVillagerClick(id: string): void {
    // Emit event to UI/Dashboard
    this.events.emit('villager-click', id)
    this.scene.get('UIScene')?.events.emit('villager-click', id)
    this.scene.get('DashboardScene')?.events.emit('villager-click', id)
  }

  private handleObjectClick(id: string): void {
    const possessed = this.store.possessedVillagerId
    if (!possessed) return
    this.ws.send({
      type: 'ACTION',
      villagerIdActing: possessed,
      action: { kind: 'INTERACT', objectId: id },
    })
  }

  private openChat(): void {
    if (this.chatActive) return
    this.chatActive = true

    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Say something... (Enter to send, Esc to cancel)'
    input.style.cssText = `
      position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
      width: 400px; padding: 8px 12px; font-size: 14px; font-family: monospace;
      background: rgba(0,0,0,0.8); color: #fff; border: 1px solid #666;
      border-radius: 4px; outline: none; z-index: 1000;
    `
    document.body.appendChild(input)
    input.focus()
    this.chatInput = input

    const close = () => {
      input.remove()
      this.chatActive = false
      this.chatInput = null
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = input.value.trim()
        if (text && this.store.possessedVillagerId) {
          this.ws.send({
            type: 'ACTION',
            villagerIdActing: this.store.possessedVillagerId,
            action: { kind: 'SPEAK', targetId: 'broadcast', text },
          })
        }
        close()
      } else if (e.key === 'Escape') {
        close()
      }
      e.stopPropagation()
    })
  }

  possess(villagerId: string): void {
    const prev = this.store.possessedVillagerId
    if (prev === villagerId) {
      // Unpossess
      this.store.possessedVillagerId = null
      this.ws.send({
        type: 'ACTION',
        villagerIdActing: prev,
        action: { kind: 'EMOTE', emote: 'wave' },
      })
      return
    }

    if (prev) {
      // Release previous
      const prevEntry = this.villagerSprites.get(prev)
      if (prevEntry?.crown) {
        prevEntry.crown.destroy()
        prevEntry.crown = null
      }
    }

    this.store.possessedVillagerId = villagerId
    this.ws.send({
      type: 'ACTION',
      villagerIdActing: villagerId,
      action: { kind: 'POSSESS', villagerIdTarget: villagerId },
    })

    // Pan to villager
    const v = this.store.villagers.get(villagerId)
    if (v) {
      this.cameras.main.pan(v.position.x * TILE + TILE / 2, v.position.y * TILE + TILE / 2, 400, 'Power2')
    }
  }
}
