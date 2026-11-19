import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.RPGTABLE_DB = join(mkdtempSync(join(tmpdir(), 'rpgtable-')), 'test.db')
const { app } = await import('../src/server/app')

const req = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

test('seeded systems + mesa', async () => {
  const systems = await (await req('GET', '/api/systems')).json() as any[]
  assert.equal(systems.length, 2)
  assert.equal(systems[0].config.roll.mode, 'pool') // JSON parsed
  assert.deepEqual(await (await req('GET', '/api/mesa')).json(), { mode: 'blank' })
})

test('campaigns CRUD + JSON roundtrip', async () => {
  const c = await req('POST', '/api/campaigns', { system_id: 1, name: 'Teste', config: { tracks: [{ key: 'x', label: 'X', min: 0, max: 10 }] } })
  assert.equal(c.status, 201)
  const created = await c.json() as any
  assert.equal(created.config.tracks[0].key, 'x')

  const list = await (await req('GET', '/api/campaigns?system_id=1')).json() as any[]
  assert.equal(list.length, 1)

  const p = await (await req('PATCH', `/api/campaigns/${created.id}`, { name: 'Novo' })).json() as any
  assert.equal(p.name, 'Novo')
  assert.equal(p.config.tracks.length, 1)

  assert.equal((await req('GET', '/api/campaigns?bogus=1')).status, 400)
  assert.equal((await req('GET', '/api/nope')).status, 404)
  assert.equal((await req('POST', '/api/campaigns', { evil: 1 })).status, 400)

  assert.equal((await req('DELETE', `/api/campaigns/${created.id}`)).status, 200)
  assert.equal((await req('GET', `/api/campaigns/${created.id}`)).status, 404)
})

test('library=1 returns campaign + library creatures', async () => {
  const c = await (await req('POST', '/api/campaigns', { system_id: 1, name: 'C2' })).json() as any
  await req('POST', '/api/creatures', { name: 'Lib', system_id: 1 })
  await req('POST', '/api/creatures', { name: 'Camp', system_id: 1, campaign_id: c.id, stats: { hp: 5 } })
  const l = await (await req('GET', `/api/creatures?campaign_id=${c.id}&library=1`)).json() as any[]
  assert.equal(l.length, 2)
})
