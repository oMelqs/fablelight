import { useRef, useState } from 'react'
import Icon from '../components/Icon'
import { useWs } from './ctx'
import { PANEL_ICONS, titleFor } from './data'
import { tabKey, type GroupNode, type TabRef, type Zone } from './layout'
import { PANELS } from './panels'

function Panel({ tab }: { tab: TabRef }) {
  return PANELS[tab.type]({ tab })
}

const zoneAt = (e: React.DragEvent, r: DOMRect): Zone => {
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
  const d = { left: x, right: 1 - x, top: y, bottom: 1 - y }
  const [k, v] = (Object.entries(d) as [Zone, number][]).sort((a, b) => a[1] - b[1])[0]
  return v >= 0.26 ? 'center' : k
}

export default function Group({ g }: { g: GroupNode }) {
  const ws = useWs()
  const [zone, setZone] = useState<Zone | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const seen = useRef(new Set<string>())
  const strip = useRef<HTMLDivElement>(null)
  if (g.active) seen.current.add(g.active)

  const focused = ws.focus === g.id
  const maxed = ws.maxGroup === g.id

  const onStripOver = (e: React.DragEvent) => {
    if (!ws.dragging) return
    e.preventDefault()
    const els = [...(strip.current?.querySelectorAll<HTMLElement>('.dtab') ?? [])]
    let idx = els.length
    for (let i = 0; i < els.length; i++) { const r = els[i].getBoundingClientRect(); if (e.clientX < r.left + r.width / 2) { idx = i; break } }
    setDropIdx(idx); setZone(null)
  }
  const onTabKey = (e: React.KeyboardEvent<HTMLElement>, id: string) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ws.activate(g.id, id) }
    else if (e.key === 'Delete') { e.preventDefault(); ws.closeTab(id) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const tabs = [...(strip.current?.querySelectorAll<HTMLElement>('[role=tab]') ?? [])]
      const i = tabs.indexOf(e.currentTarget)
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]
      if (n) { e.preventDefault(); n.focus() }
    }
  }
  const endDrag = () => { setZone(null); setDropIdx(null); ws.setDragging(null) }

  return (
    <div className={`dock${focused ? ' focus' : ''}${maxed ? ' max' : ''}${zone ? ' over' : ''}`} data-group={g.id} onPointerDownCapture={() => !focused && ws.focusGroup(g.id)}>
      <div className="dtabs" ref={strip} role="tablist" onDragOver={onStripOver}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIdx(null) }}
        onDrop={(e) => { e.preventDefault(); if (ws.dragging) ws.move(ws.dragging, g.id, 'center', dropIdx ?? undefined); endDrag() }}>
        {g.tabs.map((t, i) => {
          const title = titleFor(ws.items, t.type, t.ref, t.title)
          return (
            <div key={t.id} className={`dtab${g.active === t.id ? ' sel' : ''}${ws.dragging === t.id ? ' dragging' : ''}${dropIdx === i ? ' ins-l' : ''}${dropIdx === g.tabs.length && i === g.tabs.length - 1 ? ' ins-r' : ''}`}>
              <div role="tab" tabIndex={0} aria-selected={g.active === t.id} className="dtt"
                draggable title={title} data-key={tabKey(t)}
                onClick={() => ws.activate(g.id, t.id)} onDoubleClick={() => ws.maximize(g.id)}
                onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); ws.closeTab(t.id) } }}
                onKeyDown={(e) => onTabKey(e, t.id)}
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; ws.setDragging(t.id) }}
                onDragEnd={endDrag}>
                <Icon name={PANEL_ICONS[t.type]} size={14} />
                <span className="tt">{title}</span>
              </div>
              <button className="x" aria-label={`Fechar ${title}`} tabIndex={-1} onClick={() => ws.closeTab(t.id)}><Icon name="x" size={12} /></button>
            </div>
          )
        })}
        <span className="grow" />
        <div className="gacts">
          <button className="btn ghost ico sm" title="Dividir à direita (⌘\)" aria-label="Dividir à direita" disabled={g.tabs.length < 2} onClick={() => ws.splitFocus(g.id, 'row')}><Icon name="split" size={14} /></button>
          <button className="btn ghost ico sm" title="Dividir abaixo" aria-label="Dividir abaixo" disabled={g.tabs.length < 2} onClick={() => ws.splitFocus(g.id, 'col')}><Icon name="splitv" size={14} /></button>
          <button className="btn ghost ico sm" title="Maximizar (⌘⇧M)" aria-label="Maximizar" aria-pressed={maxed} onClick={() => ws.maximize(g.id)}><Icon name="max" size={14} /></button>
          <button className="btn ghost ico sm" title="Fechar grupo" aria-label="Fechar grupo" onClick={() => ws.closeGroup(g.id)}><Icon name="x" size={14} /></button>
        </div>
      </div>
      <div className="dbody">
        {g.tabs.filter((t) => seen.current.has(t.id)).map((t) => (
          <div className="pane" key={t.id} hidden={g.active !== t.id}><Panel tab={t} /></div>
        ))}
        {!g.tabs.length && <div className="dempty">Solte uma aba aqui, ou abra um item pelo explorador.</div>}
      </div>
      {ws.dragging && (
        <div className="drop" onDragOver={(e) => { e.preventDefault(); setDropIdx(null); setZone(zoneAt(e, e.currentTarget.getBoundingClientRect())) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setZone(null) }}
          onDrop={(e) => { e.preventDefault(); const z = zoneAt(e, e.currentTarget.getBoundingClientRect()); if (ws.dragging) ws.move(ws.dragging, g.id, z); endDrag() }}>
          {(['left', 'right', 'top', 'bottom', 'center'] as Zone[]).map((z) => <i key={z} className={`dz ${z}${zone === z ? ' on' : ''}`} />)}
        </div>
      )}
    </div>
  )
}
