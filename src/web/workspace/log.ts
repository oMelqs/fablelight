import { create, list, update } from '../api'
import type { Die, RollResult } from '../../shared/types'
import { emit, listen, lsGet, lsSet } from './util'

export type LogKind = 'combat' | 'roll' | 'scene' | 'note' | 'system'
export interface LogEntry { id: number; campaign_id: number; session_id: number | null; kind: LogKind; text: string; data: Record<string, any>; created_at: string }

/* Which campaign / session new entries belong to. Set by Workspace. */
let ctx: { campaignId: number; sessionId: number | null } | null = null
export const setLogContext = (c: { campaignId: number; sessionId: number | null } | null) => { ctx = c }
export const logContext = () => ctx

const EV = 'rpgtable:log'
export const onLog = (fn: (e: { type: 'add' | 'update'; entry: LogEntry }) => void) => listen(EV, fn)

/** Records a game event in the campaign log and notifies the open Log panel. Resolves undefined if there is no campaign. */
export async function logEvent(kind: LogKind, text: string, data: Record<string, any> = {}): Promise<LogEntry | undefined> {
  if (!ctx) return
  try {
    const entry = await create<LogEntry>('log_entries', { campaign_id: ctx.campaignId, session_id: ctx.sessionId, kind, text, data })
    emit(EV, { type: 'add', entry })
    return entry
  } catch { return }
}

/** Card data for a roll, shared by /rolar and the calculator. */
export function rollData(res: RollResult, dice: Die[], extra: { dt?: number; modifier?: number; label?: string; who?: string; mode?: string } = {}) {
  return {
    type: 'roll', total: res.total, sum: res.sum, high: res.high, low: res.low, critical: res.critical, fumble: res.fumble,
    success: res.success, margin: res.margin, dt: extra.dt, modifier: extra.modifier || undefined, label: extra.label, who: extra.who, mode: extra.mode,
    dice: dice.map((d) => ({ sides: d.sides, value: d.value, kept: res.kept.includes(d) })),
  }
}

/* ---------- combat bookkeeping shared by panels and commands ---------- */
export const encKey = (cid: number) => `rpgtable:enc:${cid}`
export const setActiveEncounter = (cid: number, id: number) => lsSet(encKey(cid), String(id))
export async function activeEncounterId(cid: number): Promise<number | null> {
  const encs = await list<{ id: number }>('encounters', { campaign_id: cid })
  const saved = Number(lsGet(encKey(cid)))
  return encs.find((e) => e.id === saved)?.id ?? encs[encs.length - 1]?.id ?? null
}
export const combatChanged = () => emit('rpgtable:combat-changed')

/** Reverts the most recent log entry that carries data.undo. Returns a short description, or null if nothing to undo. */
export async function undoLast(): Promise<string | null> {
  if (!ctx) return null
  const rows = await list<LogEntry>('log_entries', { campaign_id: ctx.campaignId })
  const e = [...rows].reverse().find((r) => r.data?.undo && !r.data.undone)
  if (!e) return null
  const u = e.data.undo as { combatant_id?: number; hp_cur?: number; character_id?: number; key?: string; cur?: number }
  if (u.combatant_id) await update('combatants', u.combatant_id, { hp_cur: u.hp_cur })
  else if (u.character_id && u.key) {
    const rows2 = await list<any>('characters', { campaign_id: ctx.campaignId })
    const ch = rows2.find((c) => c.id === u.character_id)
    if (ch) await update('characters', ch.id, { data: { ...ch.data, resources: { ...ch.data.resources, [u.key]: { ...ch.data.resources?.[u.key], cur: u.cur } } } })
  }
  const entry = await update<LogEntry>('log_entries', e.id, { data: { ...e.data, undone: true } })
  emit(EV, { type: 'update', entry })
  combatChanged()
  return e.text
}

/* ---------- scenes ---------- */
export const sceneKey = (cid: number) => `rpgtable:scene:${cid}`
/** Makes a scene the live one: remembers it, tells the Scene panel, logs the card. */
export async function enterScene(cid: number, sceneId: number, opts: { log?: boolean } = {}) {
  lsSet(sceneKey(cid), String(sceneId))
  const sc = await list<any>('scenes', { campaign_id: cid }).then((r) => r.find((s) => s.id === sceneId))
  if (!sc) return
  if (ctx && ctx.campaignId === cid) ctx.sessionId = sc.session_id ?? ctx.sessionId
  emit('rpgtable:scene', { sceneId })
  if (opts.log !== false) {
    const enc = sc.encounter_id ? await list<any>('encounters', { campaign_id: cid }).then((r) => r.find((e) => e.id === sc.encounter_id)?.name) : undefined
    await logEvent('scene', sc.title, { type: 'scene', scene_id: sc.id, title: sc.title, read: sc.read_aloud ?? '', points: (sc.points ?? []).length, encounter: enc })
  }
}
