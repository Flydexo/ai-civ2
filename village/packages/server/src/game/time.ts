import { getPhase, type GameTime, type TimePhase } from '@village/shared'

// 1 real second = 1 in-game minute → full day = 24 real minutes
export class GameClock {
  private _tick = 0
  private _hour = 7    // start at morning
  private _minute = 0
  private _phase: TimePhase = 'morning'

  get tick() { return this._tick }
  get hour() { return this._hour }
  get minute() { return this._minute }
  get phase() { return this._phase }

  get gameTime(): GameTime {
    return {
      hour: this._hour,
      minute: this._minute,
      phase: this._phase,
      tick: this._tick,
    }
  }

  get timeString(): string {
    return `${String(this._hour).padStart(2, '0')}:${String(this._minute).padStart(2, '0')}`
  }

  /**
   * Advance by one tick (200ms real time = 200ms in-game time ≈ 3.3 in-game seconds).
   * 1 real second = 1 in-game minute → 1 tick (200ms) = 0.2 in-game minutes = 12 in-game seconds.
   * 300 ticks = 1 in-game minute. But for speed, we'll do: 1 tick = 1 in-game minute (faster).
   * Actually per brief: 1 real second = 1 in-game minute. Tick is 200ms.
   * So 5 ticks = 1 real second = 1 in-game minute.
   * Returns true if phase changed.
   */
  advance(): { phaseChanged: boolean; newPhase: TimePhase | null } {
    this._tick++

    // 5 ticks = 1 real second = 1 in-game minute
    if (this._tick % 5 === 0) {
      this._minute++
      if (this._minute >= 60) {
        this._minute = 0
        this._hour = (this._hour + 1) % 24
      }
    }

    const newPhase = getPhase(this._hour)
    if (newPhase !== this._phase) {
      this._phase = newPhase
      return { phaseChanged: true, newPhase }
    }
    return { phaseChanged: false, newPhase: null }
  }

  setState(hour: number, minute: number): void {
    this._hour = hour
    this._minute = minute
    this._phase = getPhase(hour)
  }
}
