import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.RPGTABLE_DB = join(mkdtempSync(join(tmpdir(), 'rpgtable-')), 'test.db')
const { app } = await import('../src/server/app')
const json = async (method: string, path: string, body?: unknown): Promise<any> =>
  (await app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })).json()

test('hub summary', async () => {
  const c = await json('POST', '/api/campaigns', { system_id: 1, name: 'H', config: { cover: { pattern: 'raios', tone: 'brasa' } } })
  await json('POST', '/api/sessions', { campaign_id: c.id, number: 2, title: 'Dois', status: 'planned' })
  await json('POST', '/api/sessions', { campaign_id: c.id, number: 1, title: 'Um', status: 'played', date: '2026-11-01' })
  await json('POST', '/api/characters', { campaign_id: c.id, name: 'Ana', kind: 'pc' })
  const h = (await json('GET', '/api/hub')).find((r: any) => r.id === c.id)
  assert.equal(h.sessions, 2)
  assert.equal(h.pcs, 1)
  assert.equal(h.next_session.title, 'Dois')
  assert.equal(h.last_session.title, 'Um')
  assert.equal(h.last_played, '2026-11-01')
})
