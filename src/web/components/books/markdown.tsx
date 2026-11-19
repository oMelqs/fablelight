import type { ReactNode } from 'react'

// Tiny markdown renderer: headings, bold, italics, inline code, lists, tables, code blocks. React escapes all text.
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k++}>{t.slice(1, -1)}</code>)
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export default function Markdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const els: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    let m: RegExpExecArray | null
    if (/^\s*```/.test(l)) {
      const buf: string[] = []
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) buf.push(lines[i])
      i++
      els.push(<pre key={els.length}><code>{buf.join('\n')}</code></pre>)
    } else if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) {
      const H = `h${Math.min(m[1].length + 1, 6)}` as 'h2'
      els.push(<H key={els.length}>{inline(m[2])}</H>)
      i++
    } else if (l.includes('|') && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? '') && lines[i + 1].includes('-')) {
      const head = cells(l)
      const rows: string[][] = []
      for (i += 2; i < lines.length && lines[i].includes('|'); i++) rows.push(cells(lines[i]))
      els.push(
        <table key={els.length}>
          <thead><tr>{head.map((h, j) => <th key={j}>{inline(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, n) => <td key={n}>{inline(c)}</td>)}</tr>)}</tbody>
        </table>,
      )
    } else if (/^\s*([-*+]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l)
      const items: string[] = []
      for (; i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i]); i++) items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''))
      const L = ordered ? 'ol' : 'ul'
      els.push(<L key={els.length}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</L>)
    } else if (!l.trim()) i++
    else {
      const buf: string[] = []
      for (; i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*```|\s*([-*+]|\d+\.)\s)/.test(lines[i]); i++) buf.push(lines[i])
      els.push(<p key={els.length}>{inline(buf.join(' '))}</p>)
    }
  }
  return <div className="bk-md">{els}</div>
}
