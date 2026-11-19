import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.RPGTABLE_DB = join(mkdtempSync(join(tmpdir(), 'rpgtable-')), 'prep.db')
const { app } = await import('../src/server/app')
const req = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

test('session + scene with points JSON roundtrip', async () => {
  const c = await (await req('POST', '/api/campaigns', { system_id: 1, name: 'P' })).json() as any
  const s = await (await req('POST', '/api/sessions', { campaign_id: c.id, number: 1, title: 'S1' })).json() as any
  assert.equal(s.status, 'planned')
  const points = [{ title: 'Estátua', context: 'oca', checks: [{ skill: 'Percepção', dt: 7, info: 'x', found: false }] }]
  const sc = await (await req('POST', '/api/scenes', { campaign_id: c.id, session_id: s.id, title: 'Cena', points, audio_preset: { track: 1, ambients: [{ id: 2, volume: 0.4 }] } })).json() as any
  assert.deepEqual(sc.points, points)
  points[0].checks[0].found = true
  await req('PATCH', `/api/scenes/${sc.id}`, { points })
  const got = await (await req('GET', `/api/scenes/${sc.id}`)).json() as any
  assert.equal(got.points[0].checks[0].found, true)
  assert.equal(got.audio_preset.ambients[0].volume, 0.4)
})

test('mesa POST then GET', async () => {
  await req('POST', '/api/mesa', { mode: 'text', title: 'T', text: 'olá' })
  assert.deepEqual(await (await req('GET', '/api/mesa')).json(), { mode: 'text', title: 'T', text: 'olá' })
})
