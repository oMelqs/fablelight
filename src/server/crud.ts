import { Hono } from 'hono'
import { db, TABLES } from './db'

const colCache = new Map<string, Set<string>>()
function columns(table: string): Set<string> {
  let c = colCache.get(table)
  if (!c) {
    c = new Set((db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name))
    colCache.set(table, c)
  }
  return c
}

function parseRow(table: string, row: any) {
  for (const k of TABLES[table].json) if (typeof row[k] === 'string') { try { row[k] = JSON.parse(row[k]) } catch {} }
  return row
}

function toDb(table: string, body: Record<string, unknown>): Record<string, any> | string {
  const cols = columns(table)
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(body)) {
    if (k === 'id') continue
    if (!cols.has(k)) return `Coluna inválida: ${k}`
    out[k] = TABLES[table].json.includes(k) ? JSON.stringify(v ?? null)
      : typeof v === 'boolean' ? Number(v) : v
  }
  return out
}

export const crud = new Hono()

crud.use('/:table/*', async (c, next) => (TABLES[c.req.param('table')] ? next() : c.json({ error: 'Tabela desconhecida' }, 404)))
crud.use('/:table', async (c, next) => (TABLES[c.req.param('table')] ? next() : c.json({ error: 'Tabela desconhecida' }, 404)))

crud.get('/:table', (c) => {
  const table = c.req.param('table')
  const cols = columns(table)
  const where: string[] = []
  const args: any[] = []
  const q = c.req.query()
  const library = q.library === '1' && (table === 'creatures' || table === 'audio')
  for (const [k, v] of Object.entries(q)) {
    if (k === 'library') continue
    if (!cols.has(k)) return c.json({ error: `Coluna inválida: ${k}` }, 400)
    if (k === 'campaign_id' && library) { where.push('(campaign_id = ? OR campaign_id IS NULL)'); args.push(v) }
    else if (v === 'null') where.push(`${k} IS NULL`)
    else { where.push(`${k} = ?`); args.push(v) }
  }
  const order = cols.has('ord') ? 'ord, id' : 'id'
  const sql = `SELECT * FROM ${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`
  return c.json((db.prepare(sql).all(...args) as any[]).map((r) => parseRow(table, r)))
})

crud.get('/:table/:id', (c) => {
  const table = c.req.param('table')
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(c.req.param('id')))
  return row ? c.json(parseRow(table, row)) : c.json({ error: 'Não encontrado' }, 404)
})

crud.post('/:table', async (c) => {
  const table = c.req.param('table')
  const data = toDb(table, await c.req.json().catch(() => ({})))
  if (typeof data === 'string') return c.json({ error: data }, 400)
  const keys = Object.keys(data)
  try {
    const sql = keys.length
      ? `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`
      : `INSERT INTO ${table} DEFAULT VALUES`
    const r = db.prepare(sql).run(...keys.map((k) => data[k]))
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(r.lastInsertRowid)
    return c.json(parseRow(table, row), 201)
  } catch (e) { return c.json({ error: String((e as Error).message) }, 400) }
})

crud.patch('/:table/:id', async (c) => {
  const table = c.req.param('table')
  const id = Number(c.req.param('id'))
  const data = toDb(table, await c.req.json().catch(() => ({})))
  if (typeof data === 'string') return c.json({ error: data }, 400)
  if (columns(table).has('updated_at') && !('updated_at' in data)) data.updated_at = new Date().toISOString()
  const keys = Object.keys(data)
  try {
    if (keys.length) {
      const r = db.prepare(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(',')} WHERE id = ?`).run(...keys.map((k) => data[k]), id)
      if (!r.changes) return c.json({ error: 'Não encontrado' }, 404)
    }
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
    return row ? c.json(parseRow(table, row)) : c.json({ error: 'Não encontrado' }, 404)
  } catch (e) { return c.json({ error: String((e as Error).message) }, 400) }
})

crud.delete('/:table/:id', (c) => {
  const r = db.prepare(`DELETE FROM ${c.req.param('table')} WHERE id = ?`).run(Number(c.req.param('id')))
  return r.changes ? c.json({ ok: true }) : c.json({ error: 'Não encontrado' }, 404)
})
