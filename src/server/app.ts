import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { createNodeWebSocket } from '@hono/node-ws'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { FILES_DIR } from './db'
import { seedDefaults } from './seed'
import { crud } from './crud'
import { mesaRoutes, wsRoute } from './ws'
// ---- ROUTE IMPORTS (one per module) ----
import combatRoutes from './routes/combat'
import booksRoutes from './routes/books'
import audioRoutes from './routes/audio'
import prepRoutes from './routes/prep'
import hubRoutes from './routes/hub'
// -----------------------------------------

seedDefaults()

export const app = new Hono()
export const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

const api = new Hono()

api.post('/files', async (c) => {
  const body = await c.req.parseBody()
  const f = body.file
  if (!(f instanceof File)) return c.json({ error: 'Envie o campo "file"' }, 400)
  const ext = extname(f.name).replace(/[^.\w]/g, '').toLowerCase()
  const name = randomUUID() + ext
  writeFileSync(resolve(FILES_DIR, name), Buffer.from(await f.arrayBuffer()))
  return c.json({ path: `/files/${name}` }, 201)
})

mesaRoutes(api)

// ---- ROUTE REGISTRATION (one line per module; must come BEFORE crud) ----
// add `import xRoutes from './routes/x'` at the top, then one line here: xRoutes(api)
combatRoutes(api)
booksRoutes(api)
audioRoutes(api)
prepRoutes(api)
hubRoutes(api)
// -------------------------------------------------------------------------

api.route('/', crud)
app.route('/api', api)
wsRoute(app, upgradeWebSocket)

app.use('/files/*', serveStatic({ root: relative(process.cwd(), FILES_DIR) || '.', rewriteRequestPath: (p) => p.replace(/^\/files/, '') }))

const dist = resolve(process.cwd(), 'dist')
if (existsSync(dist)) {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', (c) => c.html(readFileSync(resolve(dist, 'index.html'), 'utf8')))
}
