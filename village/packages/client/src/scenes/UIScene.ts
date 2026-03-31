import Phaser from 'phaser'
import { VillageWsClient } from '../ws-client.js'
import { WorldStore } from '../store.js'

export class UIScene extends Phaser.Scene {
  private ws!: VillageWsClient
  private store!: WorldStore

  private clockText!: Phaser.GameObjects.Text
  private phaseText!: Phaser.GameObjects.Text
  private zoneText!: Phaser.GameObjects.Text
  private possessText!: Phaser.GameObjects.Text
  private controlsText!: Phaser.GameObjects.Text

  private eventLog: string[] = []
  private logContainer!: Phaser.GameObjects.Container
  private logTexts: Phaser.GameObjects.Text[] = []

  constructor() {
    super({ key: 'UIScene' })
  }

  init(data: { ws: VillageWsClient; store: WorldStore }): void {
    this.ws = data.ws
    this.store = data.store
  }

  create(): void {
    const W = this.cameras.main.width
    const H = this.cameras.main.height

    // HUD background bars
    const topBar = this.add.graphics()
    topBar.fillStyle(0x000000, 0.65)
    topBar.fillRect(0, 0, W - 300, 32)

    const bottomBar = this.add.graphics()
    bottomBar.fillStyle(0x000000, 0.65)
    bottomBar.fillRect(0, H - 32, W - 300, 32)

    // Clock
    this.clockText = this.add.text(10, 8, '07:00', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold'
    })

    // Phase
    this.phaseText = this.add.text(80, 10, 'Morning', {
      fontSize: '12px', color: '#ffffff', fontFamily: 'monospace'
    })

    // Zone
    this.zoneText = this.add.text(200, 10, '', {
      fontSize: '11px', color: '#aaffaa', fontFamily: 'monospace'
    })

    // Possession indicator
    this.possessText = this.add.text(10, H - 24, '', {
      fontSize: '12px', color: '#ffd700', fontFamily: 'monospace'
    })

    // Controls
    this.controlsText = this.add.text(W - 450, H - 24, 'WASD/Arrows: move  E: interact  T: chat  Click villager: possess', {
      fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace'
    })

    // Event log (bottom-left)
    this.logContainer = this.add.container(10, H - 160)

    // WS events
    this.ws.onMessage((msg) => {
      if (msg.type === 'WORLD_DELTA') {
        for (const s of msg.speeches) {
          const speaker = this.store.villagers.get(s.speakerId)
          this.addLogEntry(`[${speaker?.name ?? s.speakerId}]: ${s.text}`)
        }
      }
      if (msg.type === 'WORLD_EVENT') {
        if (msg.event.kind === 'TIME_PHASE_CHANGED') {
          this.addLogEntry(`-- ${msg.event.phase} --`)
        }
      }
    })

    // Listen for villager clicks from GameScene
    this.events.on('villager-click', (id: string) => {
      const gameScene = this.scene.get('GameScene') as any
      gameScene?.possess(id)
    })
  }

  override update(): void {
    const gt = this.store.gameTime
    this.clockText.setText(`${String(gt.hour).padStart(2, '0')}:${String(gt.minute).padStart(2, '0')}`)
    this.phaseText.setText(gt.phase.charAt(0).toUpperCase() + gt.phase.slice(1))

    const possessed = this.store.possessedVillagerId
    if (possessed) {
      const v = this.store.villagers.get(possessed)
      if (v) {
        this.possessText.setText(`[Possessing: ${v.name} the ${v.role}]  Zone: ${v.currentZoneId.replace(/_/g, ' ')}`)
      }
    } else {
      this.possessText.setText('No villager possessed — click one to take control')
    }
  }

  private addLogEntry(msg: string): void {
    this.eventLog.unshift(msg)
    if (this.eventLog.length > 50) this.eventLog.length = 50
    this.redrawLog()
  }

  private redrawLog(): void {
    for (const t of this.logTexts) t.destroy()
    this.logTexts = []

    const visible = this.eventLog.slice(0, 8)
    for (let i = 0; i < visible.length; i++) {
      const t = this.add.text(0, i * 13, visible[i]!, {
        fontSize: '10px',
        color: i === 0 ? '#ffffff' : '#aaaaaa',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
      })
      this.logTexts.push(t)
      this.logContainer.add(t)
    }
  }
}
