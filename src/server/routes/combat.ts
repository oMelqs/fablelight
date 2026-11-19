import type { Hono } from 'hono'
import { db } from '../db'

const one = (sql: string, ...a: any[]) => db.prepare(sql).get(...a) as any
const all = (sql: string, ...a: any[]) => db.prepare(sql).all(...a) as any[]
const parse = (s: string, d: any) => { try { return JSON.parse(s) } catch { return d } }
const encounterOut = (id: number) => ({
  encounter: one('SELECT * FROM encounters WHERE id = ?', id),
  combatants: all('SELECT * FROM combatants WHERE encounter_id = ? ORDER BY ord, id', id).map((c) => ({ ...c, conditions: parse(c.conditions, []) })),
})

export default function (api: Hono) {
  api.post('/encounters/:id/add', async (c) => {
    const id = Number(c.req.param('id'))
    if (!one('SELECT id FROM encounters WHERE id = ?', id)) return c.json({ error: 'Encontro não encontrado' }, 404)
    const b = await c.req.json().catch(() => ({}))
    const count = Math.min(Math.max(Math.floor(Number(b.count) || 1), 1), 50)
    let name: string, hp = 0, armor = 0
    if (b.creature_id) {
      const cr = one('SELECT * FROM creatures WHERE id = ?', Number(b.creature_id))
      if (!cr) return c.json({ error: 'Criatura não encontrada' }, 404)
      const st = parse(cr.stats, {})
      name = cr.name; hp = Number(st.hp) || 0; armor = Number(st.armor) || 0
    } else if (b.character_id) {
      const ch = one('SELECT * FROM characters WHERE id = ?', Number(b.character_id))
      if (!ch) return c.json({ error: 'Personagem não encontrado' }, 404)
      const pv = parse(ch.data, {}).resources?.pv
      name = ch.name; hp = Number(pv?.max) || 0
    } else return c.json({ error: 'Informe creature_id ou character_id' }, 400)
    let ord = one('SELECT COALESCE(MAX(ord), -1) m FROM combatants WHERE encounter_id = ?', id).m
    const cur = b.character_id ? Number(parse(one('SELECT data FROM characters WHERE id = ?', Number(b.character_id)).data, {}).resources?.pv?.cur ?? hp) : hp
    const ins = db.prepare('INSERT INTO combatants (encounter_id, ord, creature_id, character_id, name, hp_cur, hp_max, armor) VALUES (?,?,?,?,?,?,?,?)')
    for (let i = 1; i <= count; i++)
      ins.run(id, ++ord, b.creature_id ?? null, b.character_id ?? null, count > 1 ? `${name} ${i}` : name, cur, hp, armor)
    return c.json(encounterOut(id), 201)
  })

  api.post('/encounters/:id/next', (c) => {
    const id = Number(c.req.param('id'))
    const enc = one('SELECT * FROM encounters WHERE id = ?', id)
    if (!enc) return c.json({ error: 'Encontro não encontrado' }, 404)
    if (enc.active_id) db.prepare('UPDATE combatants SET acted = 1 WHERE id = ?').run(enc.active_id)
    const pick = () => one('SELECT id FROM combatants WHERE encounter_id = ? AND acted = 0 AND hidden = 0 ORDER BY ord, id LIMIT 1', id)
    let next = pick()
    if (!next) {
      db.prepare('UPDATE combatants SET acted = 0 WHERE encounter_id = ?').run(id)
      db.prepare('UPDATE encounters SET round = round + 1 WHERE id = ?').run(id)
      next = pick()
    }
    db.prepare('UPDATE encounters SET active_id = ? WHERE id = ?').run(next?.id ?? null, id)
    return c.json(encounterOut(id))
  })

  api.post('/encounters/:id/reset', (c) => {
    const id = Number(c.req.param('id'))
    if (!one('SELECT id FROM encounters WHERE id = ?', id)) return c.json({ error: 'Encontro não encontrado' }, 404)
    db.prepare('UPDATE combatants SET acted = 0 WHERE encounter_id = ?').run(id)
    db.prepare('UPDATE encounters SET round = 1, active_id = NULL WHERE id = ?').run(id)
    return c.json(encounterOut(id))
  })

  api.post('/campaigns/:id/duplicate-creature/:creatureId', (c) => {
    const cid = Number(c.req.param('id'))
    const cr = one('SELECT * FROM creatures WHERE id = ?', Number(c.req.param('creatureId')))
    if (!cr || !one('SELECT id FROM campaigns WHERE id = ?', cid)) return c.json({ error: 'Não encontrado' }, 404)
    const r = db.prepare('INSERT INTO creatures (system_id, campaign_id, name, tier, tags, stats, traits, notes) VALUES (?,?,?,?,?,?,?,?)')
      .run(cr.system_id, cid, cr.name, cr.tier, cr.tags, cr.stats, cr.traits, cr.notes)
    const row = one('SELECT * FROM creatures WHERE id = ?', r.lastInsertRowid)
    row.stats = parse(row.stats, {})
    return c.json(row, 201)
  })
}
