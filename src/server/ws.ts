import { Hono } from 'hono'
import type { UpgradeWebSocket } from 'hono/ws'
import type { MesaState } from '../shared/types'

type Sock = { send(data: string): void }
const clients = new Set<Sock>()
let mesa: MesaState = { mode: 'blank' }

export const getMesa = () => mesa
export function setMesa(state: MesaState) { mesa = state; broadcast({ type: 'mesa', state }) }

/** Send a message to every connected WebSocket client. */
export function broadcast(msg: unknown) {
  const data = JSON.stringify(msg)
  for (const c of clients) { try { c.send(data) } catch { clients.delete(c) } }
}

export function mesaRoutes(app: Hono) {
  app.get('/mesa', (c) => c.json(mesa))
  app.post('/mesa', async (c) => { setMesa(await c.req.json()); return c.json(mesa) })
}

export function wsRoute(app: Hono, upgradeWebSocket: UpgradeWebSocket) {
  app.get('/ws', upgradeWebSocket(() => {
    let sock: Sock
    return {
      onOpen(_e, ws) { sock = ws; clients.add(ws); ws.send(JSON.stringify({ type: 'mesa', state: mesa })) },
      onClose() { clients.delete(sock) },
    }
  }))
}
