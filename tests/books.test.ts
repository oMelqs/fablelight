import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const dir = mkdtempSync(join(tmpdir(), 'rpgtable-books-'))
process.env.RPGTABLE_DB = join(dir, 'test.db')
const { app } = await import('../src/server/app')

const req = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

const md = join(dir, 'regras.md')
writeFileSync(md, `# Regras\n\nIntro.\n\n## 7. Conflito e dano\n\n### Ferimentos\n\nO personagem sofre ferimentos graves quando a armadura falha.\n\n## Magia\n\nA feitiçaria exige concentração.\n`)

test('import-path md, chunks, accent-insensitive search', async () => {
  const r = await req('POST', '/api/books/import-path', { path: md, title: 'Regras' })
  assert.equal(r.status, 201)
  const book = await r.json() as any
  assert.equal(book.kind, 'md')
  assert.ok(book.chunks >= 3)
  for (const q of ['feiticaria', 'feitiçaria', 'concentr']) {
    const res = await (await req('GET', `/api/search?q=${encodeURIComponent(q)}`)).json() as any[]
    assert.equal(res.length, 1, q)
    assert.equal(res[0].heading, 'Regras › Magia')
    assert.match(res[0].snippet, /<mark>/)
  }
  const f = await (await req('GET', '/api/search?q=ferimentos')).json() as any[]
  assert.equal(f[0].heading, 'Regras › 7. Conflito e dano › Ferimentos')
  const ch = await (await req('GET', `/api/books/${book.id}/chunks/${f[0].chunk_id}`)).json() as any
  assert.ok(ch.prev_id && ch.next_id)
})

test('reindex replaces chunks', async () => {
  const [book] = await (await req('GET', '/api/books')).json() as any[]
  writeFileSync(join(dir, book.file_path.slice(1)), '# Novo\n\nzumbido\n')
  const r = await (await req('POST', `/api/books/${book.id}/import`)).json() as any
  assert.equal(r.chunks, 1)
  assert.equal(((await (await req('GET', '/api/search?q=feiticaria')).json()) as any[]).length, 0)
  assert.equal(((await (await req('GET', '/api/search?q=zumbido')).json()) as any[]).length, 1)
})

test('pdf import (needs pdftotext + cupsfilter/any pdf)', async (t) => {
  try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }) } catch { return t.skip('sem pdftotext') }
  const pdf = join(dir, 'a.pdf')
  const body = `BT /F1 12 Tf 50 700 Td (Capitulo Dragao) Tj ET`
  const objs = ['<</Type/Catalog/Pages 2 0 R>>', '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${body.length}>>\nstream\n${body}\nendstream`, '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>']
  let out = '%PDF-1.4\n'
  const offs: number[] = []
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const x = out.length
  out += `xref\n0 6\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${x}\n%%EOF`
  writeFileSync(pdf, out)
  const book = await (await req('POST', '/api/books/import-path', { path: pdf, title: 'PDF' })).json() as any
  assert.equal(book.kind, 'pdf')
  const res = await (await req('GET', '/api/search?q=dragao')).json() as any[]
  assert.equal(res[0].page, 1)
})
