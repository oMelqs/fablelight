import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.RPGTABLE_DB = join(mkdtempSync(join(tmpdir(), 'rpgtable-')), 'log.db')
const { app } = await import('../src/server/app')
const req = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

test('log_entries: create, filter by campaign, ordered by id, json data', async () => {
  const a = await (await req('POST', '/api/campaigns', { system_id: 1, name: 'A' })).json() as any
  const b = await (await req('POST', '/api/campaigns', { system_id: 1, name: 'B' })).json() as any
  const e1 = await (await req('POST', '/api/log_entries', { campaign_id: a.id, kind: 'combat', text: 'dano', data: { undo: { hp: 5 } } })).json() as any
  await req('POST', '/api/log_entries', { campaign_id: a.id, kind: 'note', text: 'nota' })
  await req('POST', '/api/log_entries', { campaign_id: b.id, kind: 'note', text: 'outra' })
  assert.deepEqual(e1.data, { undo: { hp: 5 } })
  const rows = await (await req('GET', `/api/log_entries?campaign_id=${a.id}`)).json() as any[]
  assert.deepEqual(rows.map((r) => r.text), ['dano', 'nota'])
  assert.equal((await req('POST', '/api/log_entries', { campaign_id: a.id, kind: 'bogus' })).status, 400)
})
