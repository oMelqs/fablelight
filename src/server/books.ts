import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { basename, extname, isAbsolute, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { FILES_DIR, db } from './db'

const run = promisify(execFile)
const MAX = 1500

export type Chunk = { heading: string; page: number | null; text: string }

/** Resolves "/files/x" (under FILES_DIR) or an absolute disk path. */
export function resolveFile(p: string): string {
  if (p.startsWith('/files/')) return resolve(FILES_DIR, p.slice('/files/'.length))
  if (isAbsolute(p)) return p
  throw new Error('Caminho inválido')
}

/** Splits text into pieces of at most MAX chars on paragraph boundaries (hard-cuts giant paragraphs). */
export function splitText(text: string, max = MAX): string[] {
  const out: string[] = []
  let cur = ''
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = '' }
  for (const para of text.split(/\n\s*\n/)) {
    if (cur && cur.length + para.length + 2 > max) push()
    if (para.length > max) {
      push()
      for (let i = 0; i < para.length; i += max) out.push(para.slice(i, i + max).trim())
    } else cur += (cur ? '\n\n' : '') + para
  }
  push()
  return out
}

export function chunkMarkdown(src: string): Chunk[] {
  const chunks: Chunk[] = []
  const path: string[] = []
  let buf: string[] = []
  let inCode = false
  const flush = () => {
    const heading = path.filter(Boolean).join(' › ')
    for (const t of splitText(buf.join('\n'))) chunks.push({ heading, page: null, text: t })
    buf = []
  }
  for (const line of src.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) inCode = !inCode
    const m = !inCode && /^(#{1,3})\s+(.+?)\s*#*$/.exec(line)
    if (m) {
      flush()
      path.length = m[1].length - 1
      path[m[1].length - 1] = m[2].trim()
    } else buf.push(line)
  }
  flush()
  return chunks
}

export async function chunkPdf(file: string): Promise<Chunk[]> {
  const { stdout } = await run('pdftotext', ['-layout', file, '-'], { maxBuffer: 512 * 1024 * 1024 })
  const chunks: Chunk[] = []
  stdout.split('\f').forEach((pg, i) => {
    const heading = pg.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
    for (const t of splitText(pg)) chunks.push({ heading, page: i + 1, text: t })
  })
  return chunks
}

export async function indexBook(id: number): Promise<number> {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any
  if (!book) throw new Error('Livro não encontrado')
  if (!book.file_path) throw new Error('Livro sem arquivo')
  const file = resolveFile(book.file_path)
  if (!existsSync(file)) throw new Error('Arquivo não encontrado: ' + file)
  const chunks = book.kind === 'pdf' ? await chunkPdf(file) : chunkMarkdown(readFileSync(file, 'utf8'))
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM book_chunks WHERE book_id = ?').run(id)
    const ins = db.prepare('INSERT INTO book_chunks (book_id, ord, heading, page, text) VALUES (?,?,?,?,?)')
    chunks.forEach((c, i) => ins.run(id, i, c.heading, c.page, c.text))
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return chunks.length
}

export async function importPath(p: { path: string; title: string; campaign_id?: number | null; system_id?: number | null }) {
  if (!isAbsolute(p.path) || !existsSync(p.path)) throw new Error('Arquivo não encontrado: ' + p.path)
  const ext = extname(p.path).toLowerCase()
  const kind = ext === '.pdf' ? 'pdf' : ext === '.md' || ext === '.markdown' || ext === '.txt' ? 'md' : null
  if (!kind) throw new Error('Use um arquivo .md ou .pdf')
  const name = randomUUID() + ext
  copyFileSync(p.path, resolve(FILES_DIR, name))
  const r = db.prepare('INSERT INTO books (system_id, campaign_id, title, kind, file_path) VALUES (?,?,?,?,?)')
    .run(p.system_id ?? null, p.campaign_id ?? null, p.title || basename(p.path, ext), kind, `/files/${name}`)
  const id = Number(r.lastInsertRowid)
  const chunks = await indexBook(id)
  return { ...(db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any), chunks }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const terms = (q: string) => q.match(/[\p{L}\p{N}]+/gu) ?? []

/** Escapes text and wraps the first match of any term in <mark>, trimmed around it. */
function snip(text: string | null, ts: string[]): string {
  const t = (text ?? '').replace(/\s+/g, ' ')
  const low = t.toLowerCase()
  let at = -1
  for (const w of ts) { const i = low.indexOf(w.toLowerCase()); if (i >= 0 && (at < 0 || i < at)) at = i }
  const s = Math.max(0, at - 60)
  let out = esc(t.slice(s, s + 200))
  for (const w of ts) out = out.replace(new RegExp(esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`)
  return (s > 0 ? '…' : '') + out + (t.length > s + 200 ? '…' : '')
}

export function search(q: string, campaignId: number | null, limit: number) {
  const ts = terms(q)
  if (!ts.length) return []
  const results: any[] = []
  const match = ts.map((w) => `"${w}"*`).join(' ')
  const rows = db.prepare(`
    SELECT c.id AS chunk_id, b.id AS book_id, b.title AS book_title, c.heading, c.page, f.rank,
           snippet(book_fts, 1, char(1), char(2), '…', 24) AS snip
    FROM book_fts f JOIN book_chunks c ON c.id = f.rowid JOIN books b ON b.id = c.book_id
    WHERE book_fts MATCH ? AND (b.campaign_id IS NULL OR b.campaign_id = ?)
    ORDER BY f.rank LIMIT ?`).all(match, campaignId, limit) as any[]
  for (const r of rows) {
    const { snip: s, ...rest } = r
    results.push({ type: 'book', ...rest, snippet: esc(s).replace(/\x01/g, '<mark>').replace(/\x02/g, '</mark>') })
  }
  if (campaignId != null) {
    const like = (cols: string[]) => ts.map(() => '(' + cols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ') + ')').join(' AND ')
    const args = (n: number) => ts.flatMap((w) => Array(n).fill(`%${w.replace(/[\\%_]/g, '\\$&')}%`))
    const add = (type: string, sql: string, n: number, pre: any[], title: string, body: (r: any) => string) => {
      for (const r of db.prepare(sql + ` LIMIT ${limit}`).all(...pre, ...args(n)) as any[])
        results.push({ type, id: r.id, title: r[title] || '(sem título)', snippet: snip(body(r), ts) })
    }
    add('note', `SELECT * FROM notes WHERE campaign_id = ? AND ${like(['title', 'body'])}`, 2, [campaignId], 'title', (r) => r.body)
    add('scene', `SELECT * FROM scenes WHERE campaign_id = ? AND ${like(['title', 'read_aloud', 'gm_notes'])}`, 3, [campaignId], 'title', (r) => [r.read_aloud, r.gm_notes].join(' '))
    add('character', `SELECT * FROM characters WHERE campaign_id = ? AND ${like(['name'])}`, 1, [campaignId], 'name', (r) => r.notes ?? '')
    add('creature', `SELECT * FROM creatures WHERE (campaign_id IS NULL OR campaign_id = ?) AND ${like(['name', 'traits'])}`, 2, [campaignId], 'name', (r) => r.traits ?? '')
  }
  return results
}

export function chunkWithNeighbours(bookId: number, chunkId: number) {
  const c = db.prepare('SELECT * FROM book_chunks WHERE id = ? AND book_id = ?').get(chunkId, bookId) as any
  if (!c) return null
  const prev = db.prepare('SELECT id FROM book_chunks WHERE book_id = ? AND ord < ? ORDER BY ord DESC LIMIT 1').get(bookId, c.ord) as any
  const next = db.prepare('SELECT id FROM book_chunks WHERE book_id = ? AND ord > ? ORDER BY ord LIMIT 1').get(bookId, c.ord) as any
  const book = db.prepare('SELECT id, title, kind, file_path FROM books WHERE id = ?').get(bookId)
  return { ...c, book, prev_id: prev?.id ?? null, next_id: next?.id ?? null }
}
