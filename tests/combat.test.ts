import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.RPGTABLE_DB = join(mkdtempSync(join(tmpdir(), 'rpgtable-')), 'combat.db')
const { app } = await import('../src/server/app')
const req = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
const json = async (r: Response) => r.json() as Promise<any>

test('add with count, next turn and round rollover', async () => {
  const camp = await json(await req('POST', '/api/campaigns', { system_id: 1, name: 'C' }))
  const cr = await json(await req('POST', '/api/creatures', { system_id: 1, name: 'Carniçal', stats: { hp: 7, armor: 2 } }))
  const pc = await json(await req('POST', '/api/characters', { campaign_id: camp.id, name: 'Ana', data: { resources: { pv: { cur: 4, max: 9 } } } }))
  const enc = await json(await req('POST', '/api/encounters', { campaign_id: camp.id, name: 'E' }))

  let r = await json(await req('POST', `/api/encounters/${enc.id}/add`, { creature_id: cr.id, count: 2 }))
  assert.deepEqual(r.combatants.map((c: any) => c.name), ['Carniçal 1', 'Carniçal 2'])
  assert.equal(r.combatants[0].hp_cur, 7)
  assert.equal(r.combatants[0].armor, 2)
  r = await json(await req('POST', `/api/encounters/${enc.id}/add`, { character_id: pc.id }))
  assert.equal(r.combatants[2].name, 'Ana')
  assert.equal(r.combatants[2].hp_cur, 4)
  assert.equal(r.combatants[2].hp_max, 9)
  assert.equal((await req('POST', `/api/encounters/${enc.id}/add`, {})).status, 400)

  const ids = r.combatants.map((c: any) => c.id)
  await req('PATCH', `/api/combatants/${ids[1]}`, { hidden: true })
  r = await json(await req('POST', `/api/encounters/${enc.id}/next`))
  assert.equal(r.encounter.active_id, ids[0])
  r = await json(await req('POST', `/api/encounters/${enc.id}/next`))
  assert.equal(r.encounter.active_id, ids[2]) // hidden skipped
  assert.equal(r.encounter.round, 1)
  r = await json(await req('POST', `/api/encounters/${enc.id}/next`))
  assert.equal(r.encounter.round, 2)
  assert.equal(r.encounter.active_id, ids[0])
  assert.equal(r.combatants.filter((c: any) => c.acted).length, 0)

  r = await json(await req('POST', `/api/encounters/${enc.id}/reset`))
  assert.equal(r.encounter.round, 1)
  assert.equal(r.encounter.active_id, null)
})

test('duplicate-creature copies library creature into campaign', async () => {
  const camp = await json(await req('POST', '/api/campaigns', { system_id: 1, name: 'D' }))
  const cr = await json(await req('POST', '/api/creatures', { system_id: 1, name: 'Lib', stats: { hp: 3 } }))
  const d = await json(await req('POST', `/api/campaigns/${camp.id}/duplicate-creature/${cr.id}`))
  assert.equal(d.campaign_id, camp.id)
  assert.equal(d.stats.hp, 3)
})
