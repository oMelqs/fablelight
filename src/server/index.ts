import { serve } from '@hono/node-server'
import { app, injectWebSocket } from './app'

const port = Number(process.env.PORT ?? 4317)
const server = serve({ fetch: app.fetch, port }, () => console.log(`Fablelight em http://localhost:${port}`))
injectWebSocket(server)
