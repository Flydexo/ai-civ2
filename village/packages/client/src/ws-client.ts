import type { ServerMessage, ClientMessage } from '@village/shared'

type MessageHandler = (msg: ServerMessage) => void

export class VillageWsClient {
  private ws: WebSocket | null = null
  private handlers: MessageHandler[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.connected = true
        console.log('[WS] Connected')
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage
          for (const h of this.handlers) h(msg)
        } catch (e) {
          console.error('[WS] Parse error', e)
        }
      }

      this.ws.onerror = (e) => {
        console.error('[WS] Error', e)
        if (!this.connected) reject(e)
      }

      this.ws.onclose = () => {
        this.connected = false
        console.log('[WS] Disconnected, reconnecting in 2s...')
        this.reconnectTimer = setTimeout(() => this.reconnect(), 2000)
      }
    })
  }

  private reconnect(): void {
    this.connect().catch(() => {})
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler)
  }

  isConnected(): boolean {
    return this.connected
  }

  destroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}
