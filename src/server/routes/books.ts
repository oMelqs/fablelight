import type { Hono } from 'hono'
import { db } from '../db'
import { chunkWithNeighbours, importPath, indexBook, search } from '../books'

export default function (api: Hono) {
  api.post('/books/import-path', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    try {
      return c.json(await importPath(b), 201)
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  api.post('/books/:id/import', async (c) => {
    try {
      return c.json({ chunks: await indexBook(Number(c.req.param('id'))) })
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  api.get('/books/:id/chunks', (c) =>
    c.json(db.prepare('SELECT id, ord, heading, page, length(text) AS len FROM book_chunks WHERE book_id = ? ORDER BY ord').all(Number(c.req.param('id')))))

  api.get('/books/:id/chunks/:chunkId', (c) => {
    const r = chunkWithNeighbours(Number(c.req.param('id')), Number(c.req.param('chunkId')))
    return r ? c.json(r) : c.json({ error: 'Trecho não encontrado' }, 404)
  })

  api.get('/search', (c) => {
    const cid = c.req.query('campaign_id')
    const limit = Math.min(Number(c.req.query('limit')) || 30, 200)
    return c.json(search(c.req.query('q') ?? '', cid ? Number(cid) : null, limit))
  })
}
