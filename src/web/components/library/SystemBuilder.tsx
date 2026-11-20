import { useEffect, useRef, useState, type ReactNode } from 'react'
import { create, remove, update } from '../../api'
import { evaluate, rollVirtual } from '../../../shared/dice'
import type { RollResult, System, SystemConfig } from '../../../shared/types'
import { LIcon } from '../../library/ui'
import { notifyItems } from '../../workspace/data'
import { Del, Seg } from '../editor/ed'
import { NEW_CONFIG, parse } from './SystemEditor'

type Cfg = SystemConfig
const DICE = [4, 6, 8, 10, 12, 20, 100]
const MODES: [Cfg['roll']['mode'], string][] = [['pool', 'pool'], ['d20', 'd20'], ['sum', 'soma'], ['d100', 'd100']]
const MODE_HELP: Record<string, string> = {
  pool: 'Junte os dados do atributo e da perícia e some os maiores. Par alto é crítico.',
  d20: 'Um d20 mais modificador contra a dificuldade. 20 natural é crítico, 1 natural é falha crítica.',
  sum: 'Some todos os dados do teste e compare com a dificuldade.',
  d100: 'Role d100 e fique igual ou abaixo do alvo. Até 1/5 do alvo é crítico, 96 ou mais é falha crítica.',
}
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const isPlaceholder = (k: string) => /^(novo|nova)(_\d+)?$/.test(k)
const uniq = (base: string, taken: string[]) => { let k = base, n = 2; while (taken.includes(k)) k = `${base}_${n++}`; return k }
const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? 0 : Number(v))

type RowDef<T> = { id: string; title: string; rows: T[]; cols: string; head: string[]; add: string; mk: (taken: string[]) => T; render: (r: T, set: (p: Partial<T>) => void) => ReactNode }

/** Collapsible section of editable rows. */
function Rows<T>({ def, collapsed, toggle, replace }: { def: RowDef<T>; collapsed: boolean; toggle: () => void; replace: (rows: T[]) => void }) {
  const { rows } = def
  return (
    <section className={`lb-fs${collapsed ? ' c' : ''}`}>
      <header onClick={toggle} aria-expanded={!collapsed} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}>
        <LIcon name="chevron" size={14} />{def.title}<span className="ct">{rows.length}</span></header>
      <div className="fb">
        {!!rows.length && <div className="lb-fh" style={{ gridTemplateColumns: def.cols }}>{def.head.map((h, i) => <span key={i}>{h}</span>)}<span /></div>}
        {rows.map((r, i) => (
          <div className="lb-fr" key={i} style={{ gridTemplateColumns: def.cols }}>
            {def.render(r, (p) => replace(rows.map((x, j) => (j === i ? { ...x, ...p } : x))))}
            <button className="btn btn-x del" aria-label="Remover" onClick={() => replace(rows.filter((_, j) => j !== i))}><LIcon name="x" size={14} /></button>
          </div>
        ))}
        <button className="lb-addr" onClick={() => replace([...rows, def.mk((rows as any[]).map((x) => x.key ?? x.label))])}><LIcon name="plus" size={14} />{def.add}</button>
      </div>
    </section>
  )
}

function Preview({ cfg }: { cfg: Cfg }) {
  const pool = cfg.roll.mode === 'pool'
  const dice = cfg.dice.length ? cfg.dice : [6]
  const attrLabel = (k?: string) => cfg.attributes.find((a) => a.key === k)?.label ?? '—'
  return (
    <div className="lb-sheet">
      <div className="lb-row"><div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Mira Valenar</div>
        <div className="lb-faint">{cfg.fields.map((f) => f.label).join(' · ') || 'Sem campos'}</div></div><span className="lb-pill"><LIcon name="users" size={13} />PJ</span></div>
      {!!cfg.attributes.length && <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${pool ? 74 : 62}px,1fr))`, gap: 6 }}>
        {cfg.attributes.map((a, i) => <div key={a.key + i} style={{ background: 'var(--raise)', borderRadius: 6, padding: '7px 4px', textAlign: 'center' }}>
          <div className="lb-faint" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</div>
          <b className="mono" style={{ fontSize: 16, fontWeight: 500 }}>{pool ? `d${dice[(i * 2 + 1) % dice.length]}` : [14, 12, 13, 10, 11, 15][i % 6]}</b></div>)}</div>}
      {!!cfg.skills.length && <div>{cfg.skills.map((k, i) => <div className="lb-row" key={k.key + i} style={{ height: 26 }}>
        <span style={{ flex: 1 }}>{k.label}</span><span className="lb-faint" style={{ fontSize: 11.5 }}>{attrLabel(k.attribute)}</span>
        <span className="mono" style={{ width: 34, textAlign: 'right' }}>{pool ? `d${dice[i % dice.length]}` : `+${(k.label.length % 4) + 1}`}</span></div>)}</div>}
      {cfg.resources.map((r, i) => <div key={r.key + i}><div className="lb-row"><span style={{ flex: 1 }}>{r.label}</span><span className="mono muted">{i ? 3 : 14}/{i ? 6 : 22}</span></div>
        <div className="lb-bar2" style={{ marginTop: 4 }}><i style={{ width: i ? '50%' : '64%', background: i ? 'var(--ac)' : 'var(--ok)' }} /></div></div>)}
      {cfg.tracks.map((t, i) => <div className="lb-row" key={t.key + i}><span style={{ width: 90 }}>{t.label}</span>
        <div className="lb-pips">{Array.from({ length: Math.max(0, Math.min(t.max - t.min, 10)) }, (_, j) => <i key={j} className={j < 4 ? 'on' : ''} />)}</div></div>)}
      {!!cfg.conditions.length && <div className="lb-row wrap" style={{ gap: 5 }}>{cfg.conditions.map((x, i) => <span key={i} className="lb-chip sm">{x}</span>)}</div>}
    </div>
  )
}

function Tester({ cfg }: { cfg: Cfg }) {
  const mode = cfg.roll.mode
  const [n, setN] = useState(3)
  const [sides, setSides] = useState(8)
  const [mod, setMod] = useState(0)
  const [dt, setDt] = useState(9)
  const [res, setRes] = useState<RollResult | null>(null)
  useEffect(() => {
    setRes(null)
    if (mode === 'd20') { setN(1); setSides(20); setDt(15) }
    else if (mode === 'd100') { setN(1); setSides(100); setDt(55) }
    else if (mode === 'sum') { setN(3); setSides(6); setDt(10) }
    else { setN(Math.min(3, cfg.roll.maxRolled ?? 3)); setSides(cfg.dice[Math.min(2, cfg.dice.length - 1)] ?? 8); setDt(cfg.difficulties[1]?.dt ?? cfg.difficulties[0]?.dt ?? 9) }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const count = mode === 'd20' || mode === 'd100' ? 1 : n
  const roll = () => setRes(evaluate(cfg.roll, rollVirtual(cfg.roll, Array.from({ length: count }, () => ({ sides }))), { dt, modifier: mode === 'd100' ? 0 : mod }))
  const field = (label: string, v: number, set: (n: number) => void) => <label className="lb-lab">{label}<input className="input mono" inputMode="numeric" value={v} onChange={(e) => set(num(e.target.value))} /></label>
  const tone = !res ? '' : res.critical ? 'crit' : res.success ? 'ok' : 'bad'
  return (
    <div className="lb-sheet">
      <div className="lb-row wrap">
        {(mode === 'pool' || mode === 'sum') && <>{field('Dados', n, setN)}{field('Lados', sides, setSides)}</>}
        {mode !== 'd100' && field('Mod.', mod, setMod)}
        {field(mode === 'd100' ? 'Alvo ≤' : 'DT', dt, setDt)}
        <span className="sp" /><button className="btn btn-primary" onClick={roll}><LIcon name="dice" size={15} />Rolar</button>
      </div>
      {res ? (
        <div className={`lb-res ${tone}`} aria-live="polite"><div className="bn">{res.total}</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="lb-row wrap" style={{ gap: 5 }}>
              {res.kept.map((d, i) => <span key={'k' + i} className={`lb-dtile ${res.critical ? 'crit' : 'keep'}`}>{d.value}</span>)}
              {res.discarded.map((d, i) => <span key={'d' + i} className="lb-dtile drop">{d.value}</span>)}</div>
            <b style={{ color: `var(--${res.critical ? 'crit' : res.success ? 'ok' : 'bad'})` }}>{res.critical ? 'Crítico' : res.fumble ? 'Falha crítica' : res.success ? 'Sucesso' : 'Falha'}{' '}
              <span className="mono muted" style={{ fontWeight: 400 }}>{mode === 'd100' ? `alvo ${dt}` : `vs DT ${dt}`}{res.margin != null ? ` · margem ${res.margin > 0 ? '+' : ''}${res.margin}` : ''}</span></b></div></div>
      ) : <div className="lb-faint" style={{ fontSize: 12.5 }}>Teste a regra com os mesmos parâmetros da mesa. Nada é salvo no log.</div>}
    </div>
  )
}

/** Visual builder for a system's config, with JSON as an editable advanced view. `system` null = new system. */
export default function SystemBuilder({ system, onSaved, onDeleted }: { system: System | null; onSaved: (s: System) => void; onDeleted?: () => void }) {
  const initial = system?.config ?? NEW_CONFIG
  const full = (c: Partial<Cfg>): Cfg => ({ ...NEW_CONFIG, ...c, roll: { ...NEW_CONFIG.roll, ...c.roll } })
  const [name, setName] = useState(system?.name ?? 'Novo sistema')
  const [cfg, setCfgState] = useState<Cfg>(full(initial))
  const [text, setText] = useState(JSON.stringify(initial, null, 2))
  const [jsonErr, setJsonErr] = useState('')
  const [view, setView] = useState<'form' | 'json'>('form')
  const [folded, setFolded] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState({ name: system?.name ?? '', json: system ? JSON.stringify(initial) : '' })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'err'>('idle')
  const [err, setErr] = useState('')
  const [delErr, setDelErr] = useState('')

  const setCfg = (c: Cfg) => { setCfgState(c); setText(JSON.stringify(c, null, 2)); setJsonErr('') }
  const patch = (p: Partial<Cfg>) => setCfg({ ...cfg, ...p })
  const onText = (t: string) => {
    setText(t)
    const r = parse(t)
    if (r.cfg) { setCfgState(full(r.cfg)); setJsonErr('') } else setJsonErr(r.error ?? 'JSON inválido')
  }
  const dirty = name !== saved.name || JSON.stringify(cfg) !== saved.json
  const canSave = !jsonErr && !!name.trim() && dirty

  const save = async () => {
    if (!canSave) return
    setState('saving'); setErr('')
    try {
      const body = { name: name.trim(), config: cfg }
      const s = system ? await update<System>('systems', system.id, body) : await create<System>('systems', body)
      setSaved({ name, json: JSON.stringify(cfg) }); setState('saved'); notifyItems(); onSaved(s)
    } catch (e) { setState('err'); setErr((e as Error).message) }
  }
  const saveRef = useRef(save); saveRef.current = save
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveRef.current() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  // ---- row definitions ----
  const keyIn = (v: string, set: (k: string) => void) => <input className="input mono" aria-label="Chave" value={v} onChange={(e) => set(slug(e.target.value))} />
  const attrKeys = cfg.attributes.map((a) => a.key)
  const renameAttr = (rows: Cfg['attributes']): Partial<Cfg> => {
    // keep skills pointing at attributes whose key was edited (same row position)
    const map = new Map(cfg.attributes.map((a, i) => [a.key, rows[i]?.key]))
    return { attributes: rows, skills: cfg.skills.map((s) => ({ ...s, attribute: s.attribute && map.get(s.attribute) ? map.get(s.attribute) : s.attribute })) }
  }
  const labelKey = <T extends { key: string; label: string }>(r: T, p: Partial<T>, taken: string[]) => (p.label !== undefined && isPlaceholder(r.key) && slug(p.label) ? { ...p, key: uniq(slug(p.label), taken) } : p)
  const keyed = <T extends { key: string; label: string }>(rows: T[], r: T, p: Partial<T>) => labelKey(r, p, rows.filter((x) => x !== r).map((x) => x.key))
  const kl = <T extends { key: string; label: string }>(rows: T[]) => (r: T, set: (p: Partial<T>) => void) => <>
    {keyIn(r.key, (key) => set({ key } as Partial<T>))}
    <input className="input" aria-label="Nome" value={r.label} onChange={(e) => set(keyed(rows, r, { label: e.target.value } as Partial<T>))} /></>

  const defs: RowDef<any>[] = [
    { id: 'att', title: 'Atributos', rows: cfg.attributes, cols: '150px 1fr 28px', head: ['Chave', 'Nome'], add: 'Adicionar atributo', mk: (t) => ({ key: uniq('novo', t), label: 'Novo atributo' }), render: kl(cfg.attributes) },
    { id: 'skl', title: 'Perícias', rows: cfg.skills, cols: '130px 1fr 150px 28px', head: ['Chave', 'Nome', 'Atributo'], add: 'Adicionar perícia',
      mk: (t) => ({ key: uniq('nova', t), label: 'Nova perícia', attribute: cfg.attributes[0]?.key }),
      render: (r, set) => <>{kl(cfg.skills)(r, set)}<select className="input" aria-label="Atributo" value={r.attribute ?? ''} onChange={(e) => set({ attribute: e.target.value || undefined })}>
        <option value="">—</option>{cfg.attributes.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select></> },
    { id: 'fld', title: 'Campos da ficha', rows: cfg.fields, cols: '130px 1fr 100px 28px', head: ['Chave', 'Nome', 'Tipo'], add: 'Adicionar campo', mk: (t) => ({ key: uniq('novo', t), label: 'Novo campo', type: 'text' }),
      render: (r, set) => <>{kl(cfg.fields)(r, set)}<select className="input" aria-label="Tipo" value={r.type} onChange={(e) => set({ type: e.target.value, options: e.target.value === 'select' ? r.options ?? [] : undefined })}>
        <option value="text">Texto</option><option value="number">Número</option><option value="select">Lista</option></select></> },
    { id: 'res', title: 'Recursos', rows: cfg.resources, cols: '150px 1fr 28px', head: ['Chave', 'Nome'], add: 'Adicionar recurso', mk: (t) => ({ key: uniq('novo', t), label: 'Novo recurso' }), render: kl(cfg.resources) },
    { id: 'trk', title: 'Trilhas', rows: cfg.tracks, cols: '110px 1fr 64px 64px 28px', head: ['Chave', 'Nome', 'Mín.', 'Máx.'], add: 'Adicionar trilha', mk: (t) => ({ key: uniq('nova', t), label: 'Nova trilha', min: 0, max: 5 }),
      render: (r, set) => <>{kl(cfg.tracks)(r, set)}
        <input className="input mono" aria-label="Mínimo" value={r.min} onChange={(e) => set({ min: num(e.target.value) })} /><input className="input mono" aria-label="Máximo" value={r.max} onChange={(e) => set({ max: num(e.target.value) })} /></> },
    { id: 'dif', title: 'Dificuldades', rows: cfg.difficulties, cols: '1fr 80px 28px', head: ['Nome', 'DT'], add: 'Adicionar dificuldade', mk: () => ({ label: 'Nova', dt: 10 }),
      render: (r, set) => <><input className="input" aria-label="Nome" value={r.label} onChange={(e) => set({ label: e.target.value })} /><input className="input mono" aria-label="DT" value={r.dt} onChange={(e) => set({ dt: num(e.target.value) })} /></> },
  ]
  const setRows: Record<string, (rows: any[]) => void> = {
    att: (rows) => patch(renameAttr(rows)), skl: (skills) => patch({ skills }), fld: (fields) => patch({ fields }), res: (resources) => patch({ resources }),
    trk: (tracks) => patch({ tracks }), dif: (difficulties) => patch({ difficulties }),
  }
  const [cond, setCond] = useState('')
  const roll = cfg.roll
  const setRoll = (p: Partial<Cfg['roll']>) => patch({ roll: { ...roll, ...p } })
  const setMode = (m: Cfg['roll']['mode']) => patch({ roll: m === 'pool' ? { ...roll, mode: m } : { mode: m }, dice: cfg.dice.length ? cfg.dice : m === 'd20' ? [20] : [6] })
  const fold = (id: string) => (
    <Rows key={id} def={defs.find((d) => d.id === id)!} collapsed={!!folded[id]} toggle={() => setFolded((f) => ({ ...f, [id]: !f[id] }))} replace={setRows[id]} />)
  const opt = (v: number | undefined, set: (n: number | undefined) => void, label: string) => (
    <label className="lb-lab">{label}<input className="input mono" inputMode="numeric" placeholder="—" value={v ?? ''} onChange={(e) => set(e.target.value.trim() === '' ? undefined : num(e.target.value))} /></label>)
  const optOf = (id: string) => cfg.fields.find((f) => f.key === id)

  return (
    <>
      <div className="lb-tb" style={{ minHeight: 0, padding: '8px 18px' }}>
        <input className="lb-big" style={{ width: 280, flex: 'none', fontSize: 16 }} aria-label="Nome do sistema" value={name} onChange={(e) => setName(e.target.value)} />
        <span className="sp" />
        {state === 'err' ? <span className="lb-pill bad" role="alert">{err}</span>
          : jsonErr ? <span className="lb-pill bad">JSON inválido</span>
          : dirty ? <span className="lb-faint" style={{ fontSize: 12 }}>Alterações não salvas · ⌘S</span>
          : state === 'saved' || system ? <span className="lb-pill ok"><LIcon name="check" size={12} />Salvo</span> : null}
        <Seg label="Modo" value={view} onChange={setView} options={[['form', 'Formulário'], ['json', 'JSON']]} />
        <button className="btn btn-primary" disabled={!canSave || state === 'saving'} onClick={save}>{system ? 'Salvar' : 'Criar sistema'}</button>
        {system && onDeleted && <Del label="Apagar" ask="Apagar sistema" onYes={() => remove('systems', system.id).then(() => { notifyItems(); onDeleted() }, (e) => setDelErr(e.message))} />}
      </div>
      {delErr && <div className="error lb-err" role="alert">{delErr}</div>}
      <div className="lb-sys">
        <div className="lb-ed"><div>
          {view === 'json' ? (
            <>
              <div className="lb-row">{jsonErr ? <span className="lb-pill bad" role="alert">{jsonErr}</span> : <span className="lb-pill ok"><LIcon name="check" size={13} />JSON válido</span>}
                <span className="lb-faint">Edite direto. O formulário e a prévia acompanham quando o JSON é válido.</span></div>
              <textarea className="lb-json" spellCheck={false} aria-label="Configuração em JSON" aria-invalid={!!jsonErr} value={text} onChange={(e) => onText(e.target.value)} />
            </>
          ) : (
            <>
              <section className="lb-fs"><div className="fb" style={{ padding: '12px 14px' }}>
                <div className="lb-row"><span className="lb-lbl" style={{ flex: 1 }}>Como se rola</span>
                  <Seg label="Modo de rolagem" value={roll.mode} onChange={setMode} options={MODES} /></div>
                <p className="muted" style={{ margin: '8px 0 10px' }}>{MODE_HELP[roll.mode]}</p>
                <div className="lb-row wrap" role="group" aria-label="Dados da escala">
                  <span className="lb-lbl">Dados</span>
                  {DICE.map((d) => <button key={d} type="button" className={`lb-chip${cfg.dice.includes(d) ? ' on' : ''}`} aria-pressed={cfg.dice.includes(d)}
                    onClick={() => patch({ dice: (cfg.dice.includes(d) ? cfg.dice.filter((x) => x !== d) : [...cfg.dice, d]).sort((a, b) => a - b) })}>d{d}</button>)}</div>
                {roll.mode === 'pool' && (
                  <div className="lb-row wrap" style={{ marginTop: 10, gap: 14 }}>
                    {opt(roll.maxRolled, (maxRolled) => setRoll({ maxRolled }), 'Máx. rolados')}
                    {opt(roll.maxSummed, (maxSummed) => setRoll({ maxSummed }), 'Somados')}
                    {opt(roll.critical?.pairMin, (pairMin) => setRoll({ critical: pairMin === undefined ? undefined : { pairMin } }), 'Par crítico ≥')}
                    <label className="lb-lab">Falha crítica: todos 1
                      <button className="lb-sw" role="switch" aria-checked={roll.fumble === 'allOnes'} onClick={() => setRoll({ fumble: roll.fumble === 'allOnes' ? undefined : 'allOnes' })} /></label>
                  </div>)}
              </div></section>
              {fold('att')}{fold('skl')}{fold('fld')}
              {cfg.fields.some((f) => f.type === 'select') && <section className="lb-fs"><div className="fb" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="lb-lbl">Opções das listas</span>
                {cfg.fields.filter((f) => f.type === 'select').map((f) => <label key={f.key} className="lb-lab"><span style={{ width: 110 }}>{f.label}</span>
                  <input className="input" style={{ flex: 1, width: 'auto' }} placeholder="opção, opção, opção" value={(optOf(f.key)?.options ?? []).join(', ')}
                    onChange={(e) => patch({ fields: cfg.fields.map((x) => (x.key === f.key ? { ...x, options: e.target.value.split(',').map((s) => s.trimStart()) } : x)) })}
                    onBlur={() => patch({ fields: cfg.fields.map((x) => (x.key === f.key ? { ...x, options: (x.options ?? []).map((s) => s.trim()).filter(Boolean) } : x)) })} /></label>)}
              </div></section>}
              {fold('res')}{fold('trk')}
              <section className={`lb-fs${folded.cnd ? ' c' : ''}`}>
                <header onClick={() => setFolded((f) => ({ ...f, cnd: !f.cnd }))} role="button" tabIndex={0} aria-expanded={!folded.cnd} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setFolded((f) => ({ ...f, cnd: !f.cnd })))}>
                  <LIcon name="chevron" size={14} />Condições<span className="ct">{cfg.conditions.length}</span></header>
                <div className="fb" style={{ padding: '12px 14px' }}><div className="lb-row wrap">
                  {cfg.conditions.map((x, i) => <span key={i} className="lb-chip">{x}<button className="btn-x" style={{ width: 16, height: 16 }} aria-label={`Remover ${x}`} onClick={() => patch({ conditions: cfg.conditions.filter((_, j) => j !== i) })}><LIcon name="x" size={11} /></button></span>)}
                  <input className="input" style={{ width: 190 }} placeholder="Nova condição + Enter" aria-label="Nova condição" value={cond} onChange={(e) => setCond(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && cond.trim()) { e.preventDefault(); patch({ conditions: [...cfg.conditions, cond.trim()] }); setCond('') } }} />
                </div></div>
              </section>
              {fold('dif')}
            </>
          )}
        </div></div>
        <aside className="lb-insp lb-pad" aria-label="Prévia">
          <span className="lb-lbl">Prévia da ficha</span><Preview cfg={cfg} />
          <span className="lb-lbl" style={{ marginTop: 6 }}>Testar a regra de rolagem</span><Tester cfg={cfg} />
        </aside>
      </div>
    </>
  )
}
