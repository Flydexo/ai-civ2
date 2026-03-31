import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { GameScene } from './scenes/GameScene.js'
import { UIScene } from './scenes/UIScene.js'
import { DashboardScene } from './scenes/DashboardScene.js'

const PANEL_W = 300
const GAME_W = 800
const GAME_H = 600
const TOTAL_W = GAME_W + PANEL_W

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: TOTAL_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scene: [BootScene, GameScene, UIScene, DashboardScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Phaser.Game(config)
