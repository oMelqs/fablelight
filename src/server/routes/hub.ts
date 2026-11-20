import type { Hono } from 'hono'
import { db } from '../db'

/** GET /api/hub: per-campaign numbers for the campaigns hub. */
export default function (api: Hono) {
  api.get('/hub', (c) => {
    const rows = db.prepare(`
      SELECT c.id,
        (SELECT COUNT(*) FROM sessions s WHERE s.campaign_id = c.id) AS sessions,
        (SELECT COUNT(*) FROM characters h WHERE h.campaign_id = c.id AND h.kind = 'pc') AS pcs,
        (SELECT MAX(d) FROM (
          SELECT MAX(l.created_at) AS d FROM log_entries l WHERE l.campaign_id = c.id
          UNION ALL SELECT MAX(s.date) FROM sessions s WHERE s.campaign_id = c.id AND s.status = 'played')) AS last_played
      FROM campaigns c ORDER BY c.id`).all() as any[]
    const next = db.prepare(`SELECT number, title, date FROM sessions WHERE campaign_id = ? AND status = 'planned'
      ORDER BY COALESCE(number, 1e9), date, id LIMIT 1`)
    const last = db.prepare(`SELECT number, title FROM sessions WHERE campaign_id = ? AND status = 'played'
      ORDER BY COALESCE(number, 0) DESC, id DESC LIMIT 1`)
    return c.json(rows.map((r) => ({ ...r, next_session: next.get(r.id) ?? null, last_session: last.get(r.id) ?? null })))
  })
}
