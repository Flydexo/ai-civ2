import Phaser from 'phaser'
import { VillageWsClient } from '../ws-client.js'
import { WorldStore } from '../store.js'

const PANEL_W = 300

export class DashboardScene extends Phaser.Scene {
  private ws!: VillageWsClient
  private store!: WorldStore

  private panel!: Phaser.GameObjects.Container
  private rows: Phaser.GameObjects.Container[] = []

  constructor() {
    super({ key: 'DashboardScene' })
  }

  init(data: { ws: VillageWsClient; store: WorldStore }): void {
    this.ws = data.ws
    this.store = data.store
  }

  create(): void {
    const W = this.cameras.main.width
    const H = this.cameras.main.height

    // Panel background
    const bg = this.add.graphics()
    bg.fillStyle(0x0a0a1a, 0.9)
    bg.fillRect(W - PANEL_W, 0, PANEL_W, H)
    bg.lineStyle(1, 0x333366)
    bg.lineBetween(W - PANEL_W, 0, W - PANEL_W, H)

    // Title
    this.add.text(W - PANEL_W + 10, 10, 'VILLAGE DASHBOARD', {
      fontSize: '11px', color: '#8888ff', fontFamily: 'monospace', fontStyle: 'bold'
    })

    this.add.text(W - PANEL_W + 10, 26, 'Villagers', {
      fontSize: '9px', color: '#666699', fontFamily: 'monospace'
    })

    // Separator
    const sep = this.add.graphics()
    sep.lineStyle(1, 0x333366)
    sep.lineBetween(W - PANEL_W, 38, W, 38)

    this.panel = this.add.container(W - PANEL_W, 42)

    // Header row
    this.add.text(W - PANEL_W + 8, 40, 'Name         Role        Zone          Status', {
      fontSize: '8px', color: '#555577', fontFamily: 'monospace'
    })
    const sepH = this.add.graphics()
    sepH.lineStyle(1, 0x222244)
    sepH.lineBetween(W - PANEL_W, 50, W, 50)

    this.buildRows()

    // Refresh on WS delta
    this.ws.onMessage((msg) => {
      if (msg.type === 'WORLD_DELTA') {
        this.refreshRows()
      }
    })
  }

  private buildRows(): void {
    const villagers = [...this.store.villagers.values()]
    const W = this.cameras.main.width

    this.rows.forEach(r => r.destroy())
    this.rows = []

    villagers.forEach((v, i) => {
      const rowY = i * 24
      const row = this.add.container(0, rowY)

      // Hover background
      const hover = this.add.graphics()
      hover.fillStyle(0x111133, 0)
      hover.fillRect(0, 0, PANEL_W, 22)

      // Status badge color
      const statusColor = this.getStatusColor(v)
      const badge = this.add.graphics()
      badge.fillStyle(statusColor, 1)
      badge.fillCircle(8, 11, 4)

      // Name
      const nameText = this.add.text(18, 2, v.name, {
        fontSize: '9px', color: '#ddddff', fontFamily: 'monospace', fontStyle: 'bold'
      })

      // Role
      const roleText = this.add.text(18, 13, v.role, {
        fontSize: '8px', color: '#9999cc', fontFamily: 'monospace'
      })

      // Zone
      const zoneText = this.add.text(90, 2, v.currentZoneId.replace(/_/g, ' ').slice(0, 14), {
        fontSize: '8px', color: '#7799aa', fontFamily: 'monospace'
      })

      // Status label
      const statusLabel = this.getStatusLabel(v)
      const statusText = this.add.text(200, 2, statusLabel, {
        fontSize: '8px', color: this.numberToHex(statusColor), fontFamily: 'monospace'
      })

      // Position
      const posText = this.add.text(90, 13, `(${v.position.x},${v.position.y})`, {
        fontSize: '7px', color: '#555577', fontFamily: 'monospace'
      })

      row.add([hover, badge, nameText, roleText, zoneText, statusText, posText])

      // Make interactive
      hover.setInteractive(new Phaser.Geom.Rectangle(0, 0, PANEL_W, 22), Phaser.Geom.Rectangle.Contains)
      hover.on('pointerover', () => {
        hover.clear()
        hover.fillStyle(0x1a1a44, 1)
        hover.fillRect(0, 0, PANEL_W, 22)
        hover.fillStyle(statusColor, 1)
        hover.fillCircle(8, 11, 4)
      })
      hover.on('pointerout', () => {
        hover.clear()
        hover.fillStyle(0x111133, 0)
        hover.fillRect(0, 0, PANEL_W, 22)
        hover.fillStyle(statusColor, 1)
        hover.fillCircle(8, 11, 4)
      })
      hover.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene') as any
        gameScene?.possess(v.id)
      })

      // Separator line
      const sepLine = this.add.graphics()
      sepLine.lineStyle(1, 0x1a1a33)
      sepLine.lineBetween(0, 22, PANEL_W, 22)
      row.add(sepLine)

      this.panel.add(row)
      this.rows.push(row)
    })

    // Tick counter at bottom
    const H = this.cameras.main.height
    this.add.text(W - PANEL_W + 8, H - 20, '', {
      fontSize: '8px', color: '#333355', fontFamily: 'monospace'
    }).setName('tick-counter')
  }

  private refreshRows(): void {
    // Lightweight update — just rebuild (8 villagers is fast)
    this.panel.removeAll(true)
    this.rows = []
    this.buildRows()
  }

  private getStatusColor(v: { controlledBy: string; agentConnected: boolean; animation: string }): number {
    if (v.controlledBy === 'human') return 0xffd700
    if (v.controlledBy === 'agent') return v.agentConnected ? 0x00ff88 : 0xff6600
    if (v.animation === 'walk') return 0x4488ff
    if (v.animation === 'work') return 0xff8844
    return 0x555577
  }

  private getStatusLabel(v: { controlledBy: string; agentConnected: boolean; animation: string }): string {
    if (v.controlledBy === 'human') return 'possessed'
    if (v.controlledBy === 'agent') return v.agentConnected ? 'agent' : 'agent?'
    if (v.animation === 'walk') return 'moving'
    if (v.animation === 'work') return 'working'
    if (v.animation === 'sleep') return 'sleeping'
    return 'idle'
  }

  private numberToHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
