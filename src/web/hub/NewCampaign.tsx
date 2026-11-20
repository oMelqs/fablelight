import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { create, list, uploadFile } from '../api'
import type { CoverPattern, CoverTone, System } from '../../shared/types'
import Icon from '../components/Icon'
import CampaignCard from './CampaignCard'
import CampaignCover, { PATTERNS, TONES, TONE_LABEL } from './CampaignCover'
import '../components/editor/ed.css'
import './hub.css'

const rule = (s: System) => {
  const { roll, dice } = s.config
  if (roll.mode === 'pool') return `Pool de dados: some os maiores. Dados de d${dice[0]} a d${dice[dice.length - 1]}.`
  if (roll.mode === 'd20') return 'Role um d20, some o modificador e compare com a dificuldade.'
  if (roll.mode === 'd100') return 'Role um d100 contra o valor da perícia.'
  return 'Role e some os dados.'
}

export default function NewCampaign() {
  const nav = useNavigate()
  const [systems, setSystems] = useState<System[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemId, setSystemId] = useState(0)
  const [pattern, setPattern] = useState<CoverPattern>('ondas')
  const [tone, setTone] = useState<CoverTone>('indigo')
  const [image, setImage] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => { list<System>('systems').then((s) => { setSystems(s); setSystemId((c) => c || s[0]?.id || 0) }, (e) => setErr(e.message)) }, [])

  const ok = !!name.trim() && !!systemId && !busy
  const submit = async () => {
    if (!ok) return
    setBusy(true)
    try {
      const c = await create('campaigns', { name: name.trim(), description: description.trim() || null, system_id: systemId, config: { cover: { pattern, tone, ...(image ? { image } : {}) } } })
      nav(`/c/${c.id}`)
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  const submitRef = useRef(submit)
  submitRef.current = submit
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav('/')
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitRef.current()
    }
    addEventListener('keydown', h)
    return () => removeEventListener('keydown', h)
  }, [nav])

  const pick = async (f?: File) => {
    if (!f) return
    try { setImage((await uploadFile(f)).path) } catch (e) { setErr((e as Error).message) }
  }
  const sys = systems.find((s) => s.id === systemId)
  const draft = { id: 0, name, description, config: { cover: { pattern, tone, image } } }

  return (
    <div className="cre">
      <div className="cre-form"><div>
        <Link className="btn btn-ghost btn-sm" to="/" style={{ marginLeft: -8 }}><Icon name="back" size={14} />Campanhas</Link>
        <h1 className="hub-t" style={{ margin: '8px 0 6px' }}>Nova campanha</h1>
        <p className="dim">Só o nome é obrigatório. O resto você muda depois.</p>
        {err && <div className="ed-err" role="alert" style={{ marginTop: 12 }}>{err}</div>}

        <section className={'cre-sec' + (name.trim() ? ' done' : '')}>
          <div className="cre-num">{name.trim() ? <Icon name="check" size={12} /> : 1}</div>
          <h3>Nome</h3>
          <div className="cre-body">
            <input className="input cre-name" aria-label="Nome" placeholder="Ex.: O Farol de Vesper" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="input" aria-label="Descrição" rows={2} placeholder="Uma frase sobre a campanha (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </section>

        <section className="cre-sec done">
          <div className="cre-num"><Icon name="check" size={12} /></div>
          <h3>Sistema</h3>
          <div className="cre-body" role="radiogroup" aria-label="Sistema">
            {systems.map((s) => (
              <button key={s.id} type="button" className="cre-radio" role="radio" aria-checked={s.id === systemId} onClick={() => setSystemId(s.id)}>
                <span className="cre-rd" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{s.name}</b>
                  <span className="dim cre-rule">{rule(s)}</span>
                  <span className="cre-dies">
                    {s.config.dice.length > 1 && s.config.dice.map((d) => <span key={d} className="cre-dt cre-die">d{d}</span>)}
                    {s.config.attributes.slice(0, 6).map((a) => <span key={a.key} className="cre-dt" title={a.label}>{a.label.slice(0, 3)}</span>)}
                  </span>
                </span>
                <span className="mono faint">{s.config.attributes.length} atrib.</span>
              </button>
            ))}
            <Link className="btn btn-ghost btn-sm" to="/biblioteca/sistemas" style={{ alignSelf: 'flex-start' }}><Icon name="systems" size={14} />Criar ou editar sistemas</Link>
          </div>
        </section>

        <section className="cre-sec done">
          <div className="cre-num"><Icon name="check" size={12} /></div>
          <h3>Capa</h3>
          <div className="cre-body">
            <div className="cre-covpick">
              {PATTERNS.map((p) => (
                <button key={p} type="button" className="cre-covt" aria-pressed={!image && p === pattern} aria-label={p} onClick={() => { setPattern(p); setImage(undefined) }}>
                  <CampaignCover pattern={p} tone={tone} name="" initial={false} />
                </button>
              ))}
              <button type="button" className="cre-covt cre-drop" aria-pressed={!!image} onClick={() => file.current?.click()}>
                <Icon name="scene" size={16} /><span>{image ? 'Trocar imagem' : 'Usar imagem'}</span>
              </button>
              <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
            </div>
            <div className="hub-tone"><span className="dim">Tom</span>
              <div className="ed-seg" role="group" aria-label="Tom">
                {(Object.keys(TONES) as CoverTone[]).map((t) => <button key={t} type="button" className={t === tone ? 'on' : ''} aria-pressed={t === tone} onClick={() => setTone(t)}>{TONE_LABEL[t]}</button>)}
              </div>
            </div>
          </div>
        </section>

        <div className="cre-foot"><div>
          <Link className="btn" to="/">Cancelar<kbd>Esc</kbd></Link>
          <span style={{ flex: 1 }} />
          {!name.trim() && <span className="faint">Dê um nome para criar</span>}
          <button className="btn btn-primary" disabled={!ok} onClick={submit}>Criar campanha<kbd>⌘↵</kbd></button>
        </div></div>
      </div></div>

      <aside className="cre-prev">
        <span className="lbl">Prévia</span>
        <div className="cc cc-static"><CampaignCard preview c={draft} system={sys} /></div>
        <div className="faint" style={{ fontSize: 12 }}>A capa é gerada a partir do nome. Você pode trocar por uma imagem a qualquer momento.</div>
      </aside>
    </div>
  )
}
