import { create, get, list, postJson, update } from '../api'
import { evaluate, rollVirtual } from '../../shared/dice'
import type { Die, System } from '../../shared/types'
import { PANEL_TITLES, type Items } from './data'
import type { OpenSpec } from './ctx'
import type { PanelType } from './layout'
import { activeEncounterId, combatChanged, enterScene, logEvent, rollData } from './log'
import { norm } from './util'

interface Comb { id: number; name: string; hp_cur: number; hp_max: number; armor: number; conditions: string[]; acted: number; hidden: number }
interface Enc { id: number; round: number; active_id: number | null }
interface Pc { id: number; name: string; kind: string; data: { resources?: Record<string, { cur: number; max: number }> } }

export interface CmdCtx {
  campaignId: number
  system?: System
  items: Items
  cmd?: string
  open: (spec: OpenSpec, opts?: { beside?: boolean }) => void
  preset: (name: string) => boolean
  layoutNames: string[]
}

const sgn = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n)

/** Splits a trailing number: "carniçal 1 5" -> rest "carniçal 1", n 5. "=7" sets exactly, "+3"/"-3" are signed. */
function tail(arg: string) {
  const t = arg.trim().split(/\s+/).filter(Boolean)
  let n: number | null = null, abs = false, signed = false
  const last = t[t.length - 1]
  if (last && /^[=+\-−]?\d+$/.test(last)) {
    t.pop()
    const x = last.replace('−', '-')
    abs = x[0] === '='; signed = /^[+-]/.test(x); n = parseInt(x.replace('=', ''), 10)
  }
  return { rest: t.join(' '), n, abs, signed }
}
const need = (n: number | null): number => { if (n == null) throw new Error('Falta o número.'); return n }

function pickOne<T>(q: string, list: T[], name: (x: T) => string, what: string): T {
  const k = norm(q.trim())
  if (!k) throw new Error(`Informe ${what}. Opções: ${list.map(name).join(', ') || '(nenhuma)'}.`)
  const exact = list.filter((x) => norm(name(x)) === k)
  if (exact.length === 1) return exact[0]
  const m = list.filter((x) => norm(name(x)).includes(k))
  if (m.length === 1) return m[0]
  if (!m.length) throw new Error(`Nada encontrado para “${q.trim()}”. Opções: ${list.map(name).join(', ') || '(nenhuma)'}.`)
  throw new Error(`“${q.trim()}” combina com ${m.map(name).join(', ')}. Seja mais específico.`)
}

async function combat(ctx: CmdCtx) {
  const id = await activeEncounterId(ctx.campaignId)
  if (!id) throw new Error('Nenhum encontro ativo. Crie um no explorador.')
  const [enc, rows] = await Promise.all([get<Enc>('encounters', id), list<Comb>('combatants', { encounter_id: id })])
  if (!rows.length) throw new Error('O encontro ativo não tem combatentes.')
  return { id, enc, rows }
}
const L = (ctx: CmdCtx, kind: Parameters<typeof logEvent>[0], text: string, data: Record<string, any>) => logEvent(kind, text, { ...data, cmd: ctx.cmd })

async function hp(ctx: CmdCtx, c: Comb, after: number, extra: Record<string, any> = {}) {
  const before = c.hp_cur
  await update('combatants', c.id, { hp_cur: after })
  combatChanged()
  await L(ctx, 'combat', `${c.name} ${after >= before ? '+' : '−'}${Math.abs(after - before)} PV`, {
    type: 'hp', name: c.name, combatant_id: c.id, before, after, max: c.hp_max, undo: { combatant_id: c.id, hp_cur: before }, ...extra,
  })
}

async function order(ctx: CmdCtx, encId: number) {
  const [enc, rows] = await Promise.all([get<Enc>('encounters', encId), list<Comb>('combatants', { encounter_id: encId })])
  return { enc, rows, order: rows.map((x) => ({ name: x.name, state: x.id === enc.active_id ? 'a' : x.hidden || x.acted ? 'd' : '' })) }
}

export async function nextTurn(ctx: CmdCtx) {
  const { id, enc: before } = await combat(ctx)
  await postJson(`/api/encounters/${id}/next`)
  const { enc, rows, order: ord } = await order(ctx, id)
  const cur = rows.find((x) => x.id === enc.active_id)
  combatChanged()
  await L(ctx, 'combat', cur ? `Turno de ${cur.name}` : 'Turno', { type: 'turn', round: enc.round, name: cur?.name, newRound: enc.round > before.round, order: ord })
}

export interface Cmd { u: string; d: string; arg?: 'alvo' | 'pc' | 'cena' | 'cond' | 'layout' | 'abrir'; run: (arg: string, ctx: CmdCtx) => Promise<string | void> }

export const COMMANDS: Record<string, Cmd> = {
  dano: { u: '/dano <alvo> <n>', d: 'Aplica dano descontando a armadura (mínimo 1)', arg: 'alvo', async run(a, ctx) {
    const { rest, n } = tail(a); const v = need(n)
    if (v <= 0) throw new Error('O dano precisa ser maior que zero.')
    const { rows } = await combat(ctx)
    const c = pickOne(rest || '', rows, (x) => x.name, 'o alvo')
    const eff = Math.max(1, v - c.armor)
    await hp(ctx, c, Math.max(0, c.hp_cur - eff), { amount: v, armor: c.armor, sub: `${v} de dano${c.armor ? ` − ${c.armor} de armadura = ${eff}` : ''}` })
  } },
  cura: { u: '/cura <alvo> <n>', d: 'Recupera PV até o máximo', arg: 'alvo', async run(a, ctx) {
    const { rest, n } = tail(a); const v = need(n)
    if (v <= 0) throw new Error('A cura precisa ser maior que zero.')
    const { rows } = await combat(ctx)
    const c = pickOne(rest, rows, (x) => x.name, 'o alvo')
    await hp(ctx, c, c.hp_max ? Math.min(c.hp_max, c.hp_cur + v) : c.hp_cur + v, { amount: v })
  } },
  pv: { u: '/pv <alvo> <n|=n>', d: 'Soma ou define PV direto, sem armadura', arg: 'alvo', async run(a, ctx) {
    const { rest, n, abs } = tail(a); const v = need(n)
    let comb: Awaited<ReturnType<typeof combat>> | null = null
    try { comb = await combat(ctx) } catch {}
    const pcs = (await list<Pc>('characters', { campaign_id: ctx.campaignId })).filter((p) => p.kind === 'pc')
    const k = norm(rest)
    const inComb = comb?.rows.filter((x) => norm(x.name).includes(k)) ?? []
    if (k && inComb.length >= 1 && comb) {
      const c = pickOne(rest, comb.rows, (x) => x.name, 'o alvo')
      const after = Math.max(0, c.hp_max ? Math.min(c.hp_max, abs ? v : c.hp_cur + v) : abs ? v : c.hp_cur + v)
      return hp(ctx, c, after)
    }
    const p = pickOne(rest, pcs, (x) => x.name, 'o alvo')
    if (!ctx.system?.config.resources?.some((x) => x.key === 'pv')) throw new Error('O sistema não tem o recurso PV.')
    const r = p.data.resources?.pv ?? { cur: 0, max: 0 }
    const after = Math.max(0, Math.min(r.max || Infinity, abs ? v : r.cur + v))
    await update('characters', p.id, { data: { ...p.data, resources: { ...p.data.resources, pv: { ...r, cur: after } } } })
    combatChanged()
    await L(ctx, 'combat', `${p.name} ${sgn(after - r.cur)} PV`, { type: 'hp', name: p.name, before: r.cur, after, max: r.max, undo: { character_id: p.id, key: 'pv', cur: r.cur } })
  } },
  cond: { u: '/cond <alvo> <condição>', d: 'Liga ou desliga uma condição', arg: 'cond', async run(a, ctx) {
    const { rows } = await combat(ctx)
    const q = norm(a.trim())
    const c = rows.filter((x) => q.startsWith(norm(x.name))).sort((x, y) => y.name.length - x.name.length)[0]
    if (!c) throw new Error('Informe o alvo e a condição. Alvos: ' + rows.map((x) => x.name).join(', ') + '.')
    const raw = a.trim().slice(c.name.length).trim()
    if (!raw) throw new Error('Qual condição? ' + (ctx.system?.config.conditions ?? []).join(', ') + '.')
    const known = ctx.system?.config.conditions ?? []
    const m = known.filter((x) => norm(x).includes(norm(raw)))
    const cond = known.find((x) => norm(x) === norm(raw)) ?? (m.length === 1 ? m[0] : m.length > 1 ? (() => { throw new Error('Qual delas? ' + m.join(', ') + '.') })() : raw)
    const had = c.conditions.includes(cond)
    await update('combatants', c.id, { conditions: had ? c.conditions.filter((x) => x !== cond) : [...c.conditions, cond] })
    combatChanged()
    await L(ctx, 'combat', `${c.name} ${had ? 'sem' : 'com'} ${cond}`, { type: 'cond', name: c.name, cond, on: !had })
  } },
  turno: { u: '/turno', d: 'Passa para o próximo turno', run: (_a, ctx) => nextTurn(ctx) },
  rodada: { u: '/rodada [n|=n]', d: 'Avança a rodada, ou ajusta o contador', async run(a, ctx) {
    const { id, enc, rows } = await combat(ctx)
    const { n, abs } = tail(a)
    const round = Math.max(1, n == null ? enc.round + 1 : abs ? n : enc.round + n)
    await update('encounters', id, { round, ...(n == null ? { active_id: null } : {}) })
    if (n == null) await Promise.all(rows.map((r) => update('combatants', r.id, { acted: 0 })))
    combatChanged()
    await L(ctx, 'combat', `Rodada ${round}`, { type: 'round', round, before: enc.round })
  } },
  rolar: { u: '/rolar <dados…> [dt n]', d: 'Avalia dados físicos com a regra do sistema (também aceita 3d8)', async run(a, ctx) {
    const cfg = ctx.system?.config
    if (!cfg) throw new Error('O sistema da campanha ainda não carregou.')
    const toks = a.trim().split(/\s+/).filter(Boolean)
    const dice: Die[] = []
    let dt: number | undefined, modifier = 0, label: string | undefined
    for (let i = 0; i < toks.length; i++) {
      const t = norm(toks[i])
      if (t === 'dt') {
        const w = norm(toks[++i] ?? '')
        const diff = cfg.difficulties?.find((d) => norm(d.label).startsWith(w))
        dt = /^\d+$/.test(w) ? Number(w) : diff?.dt
        if (dt === undefined) throw new Error('DT inválida. Use um número' + (cfg.difficulties?.length ? ' ou ' + cfg.difficulties.map((d) => norm(d.label)).join(', ') : '') + '.')
        label = diff && diff.dt === dt ? diff.label : undefined
      } else if (/^[+-]\d+$/.test(t)) modifier += Number(t)
      else if (/^\d+$/.test(t)) {
        const v = Number(t)
        if (v < 1) throw new Error('Os valores dos dados começam em 1.')
        dice.push({ sides: cfg.dice?.find((s) => s >= v) ?? v, value: v })
      } else if (/^\d+d\d+$/.test(t)) {
        const [c, s] = t.split('d').map(Number)
        if (c > 20 || s < 2) throw new Error('Use até 20 dados, com pelo menos 2 faces.')
        dice.push(...rollVirtual(cfg.roll, Array.from({ length: c }, () => ({ sides: s }))))
      } else throw new Error(`Não entendi “${toks[i]}”. Ex.: /rolar 6 4 3 dt 10`)
    }
    if (!dice.length) throw new Error('Informe ao menos um dado. Ex.: /rolar 6 4 3 dt 10')
    const res = evaluate(cfg.roll, dice, { dt, modifier })
    await create('rolls', { campaign_id: ctx.campaignId, label: label ?? null, input: { dice, dt, modifier }, result: res }).catch(() => {})
    await L(ctx, 'roll', `Rolagem ${res.total}`, rollData(res, dice, { dt, modifier, label, mode: cfg.roll.mode }))
  } },
  cena: { u: '/cena <nome>', d: 'Entra numa cena e mostra o texto de leitura', arg: 'cena', async run(a, ctx) {
    const sc = pickOne(a, ctx.items.scenes, (s) => s.title, 'a cena')
    ctx.open({ type: 'scene' })
    await enterScene(ctx.campaignId, sc.id)
  } },
  nota: { u: '/nota <texto>', d: 'Guarda uma nota no registro e nas notas da campanha', async run(a, ctx) {
    const text = a.trim()
    if (!text) throw new Error('Escreva a nota depois do comando.')
    const n = await create<{ id: number }>('notes', { campaign_id: ctx.campaignId, body: text })
    await L(ctx, 'note', text, { type: 'note', note_id: n.id })
  } },
  abrir: { u: '/abrir <nome>', d: 'Abre um item ou painel numa aba', arg: 'abrir', async run(a, ctx) {
    const it = pickOne(a, openables(ctx.items), (x) => x.label, 'o item')
    ctx.open(it.spec)
    return `Aberto: ${it.label}`
  } },
  layout: { u: '/layout <nome>', d: 'Troca o layout da tela', arg: 'layout', async run(a, ctx) {
    const name = pickOne(a, ctx.layoutNames, (x) => x, 'o layout')
    ctx.preset(name)
    return `Layout: ${name}`
  } },
  ajuda: { u: '/ajuda', d: 'Lista os comandos', async run() {
    return Object.values(COMMANDS).map((c) => `${c.u}   ${c.d}`).join('\n')
  } },
}

/** Everything /abrir, the palette and the explorer filter can open. */
export function openables(items: Items): { label: string; hint: string; spec: OpenSpec }[] {
  const panels: PanelType[] = ['log', 'scene', 'combat', 'calc', 'books', 'audio', 'party', 'library-bestiary', 'library-systems', 'library-books', 'library-audio']
  return [
    ...panels.map((t) => ({ label: PANEL_TITLES[t], hint: 'Painel', spec: { type: t } as OpenSpec })),
    ...items.sessions.map((s) => ({ label: `Sessão ${s.number ?? ''}${s.title ? ' — ' + s.title : ''}`.trim(), hint: 'Sessão', spec: { type: 'session', ref: s.id } as OpenSpec })),
    ...items.scenes.map((s) => ({ label: s.title, hint: 'Cena', spec: { type: 'scene-edit', ref: s.id } as OpenSpec })),
    ...items.encounters.map((s) => ({ label: s.name, hint: 'Encontro', spec: { type: 'encounter', ref: s.id } as OpenSpec })),
    ...items.characters.map((s) => ({ label: s.name, hint: s.kind === 'pc' ? 'PJ' : 'NPC', spec: { type: 'character', ref: s.id } as OpenSpec })),
    ...items.notes.map((s) => ({ label: s.title || s.body.slice(0, 40) || 'Nota', hint: 'Nota', spec: { type: 'note', ref: s.id } as OpenSpec })),
    ...items.creatures.map((s) => ({ label: s.name, hint: 'Criatura', spec: { type: 'creature', ref: s.id } as OpenSpec })),
    ...items.systems.map((s) => ({ label: s.name, hint: 'Sistema', spec: { type: 'system', ref: s.id } as OpenSpec })),
  ]
}

export async function runCommand(text: string, ctx: CmdCtx): Promise<string | void> {
  text = text.trim()
  if (!text) return
  const plain = !text.startsWith('/')
  const m = (plain ? '/nota ' + text : text).match(/^\/(\S+)\s*([\s\S]*)$/)!
  const c = COMMANDS[norm(m[1])]
  if (!c) throw new Error(`Comando /${m[1]} não existe. Digite / para ver a lista.`)
  try { return await c.run(m[2], { ...ctx, cmd: plain ? undefined : text }) }
  catch (e) { throw Object.assign(new Error((e as Error).message), { usage: c.u }) }
}

/* ---------- autocomplete ---------- */
export interface Suggest { ins: string; a: string; d: string; cmd?: boolean }
export interface SuggestData { targets: string[]; pcs: string[]; scenes: string[]; open: string[]; layouts: string[]; conds: string[] }

export function suggest(v: string, data: SuggestData): Suggest[] {
  if (!v.startsWith('/')) return []
  const m = v.match(/^\/(\S*)(\s[\s\S]*)?$/)!
  if (m[2] === undefined) {
    const q = norm(m[1])
    return Object.entries(COMMANDS).filter(([n]) => n.startsWith(q)).map(([n, c]) => ({ ins: '/' + n + ' ', a: '/' + n, d: c.u + '  ·  ' + c.d, cmd: true }))
  }
  const c = COMMANDS[norm(m[1])]
  if (!c) return []
  const rest = m[2].replace(/^\s/, ''), pre = '/' + m[1] + ' '
  const pick = (l: string[], q: string) => l.filter((x) => norm(x).includes(norm(q)) && norm(x) !== norm(q)).slice(0, 8).map((x) => ({ ins: pre + x + ' ', a: x, d: '' }))
  if (c.arg === 'alvo' && !/\d/.test(rest)) return pick([...data.targets, ...data.pcs.filter((p) => !data.targets.includes(p))], rest)
  if (c.arg === 'cena') return pick(data.scenes, rest)
  if (c.arg === 'abrir') return pick(data.open, rest)
  if (c.arg === 'layout') return pick(data.layouts, rest)
  if (c.arg === 'cond') {
    const t = data.targets.find((k) => norm(rest).startsWith(norm(k) + ' '))
    if (!t) return pick(data.targets, rest)
    const q = rest.slice(t.length + 1)
    return data.conds.filter((k) => norm(k).includes(norm(q)) && norm(k) !== norm(q)).map((k) => ({ ins: pre + t + ' ' + k, a: k, d: t }))
  }
  return []
}
