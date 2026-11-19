import { useEffect, useRef } from 'react'

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as any).error ?? `Erro ${r.status}`)
  return data as T
}

type Params = Record<string, string | number | boolean | null | undefined>

export function list<T = any>(table: string, params: Params = {}): Promise<T[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, v === true ? '1' : String(v))
  const s = qs.toString()
  return req('GET', `/api/${table}${s ? '?' + s : ''}`)
}
export const get = <T = any>(table: string, id: number | string) => req<T>('GET', `/api/${table}/${id}`)
export const create = <T = any>(table: string, body: Record<string, unknown>) => req<T>('POST', `/api/${table}`, body)
export const update = <T = any>(table: string, id: number | string, body: Record<string, unknown>) => req<T>('PATCH', `/api/${table}/${id}`, body)
export const remove = (table: string, id: number | string) => req<{ ok: true }>('DELETE', `/api/${table}/${id}`)
/** Generic JSON helpers for non-CRUD routes. */
export const getJson = <T = any>(url: string) => req<T>('GET', url)
export const postJson = <T = any>(url: string, body?: unknown) => req<T>('POST', url, body ?? {})

export async function uploadFile(file: File): Promise<{ path: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch('/api/files', { method: 'POST', body: fd })
  if (!r.ok) throw new Error(`Erro no upload (${r.status})`)
  return r.json()
}

/** Subscribes to /ws; reconnects automatically. `onMessage` receives parsed JSON. */
export function useWs(onMessage: (msg: any) => void) {
  const cb = useRef(onMessage)
  cb.current = onMessage
  useEffect(() => {
    let ws: WebSocket | undefined
    let timer: number | undefined
    let closed = false
    const connect = () => {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`)
      ws.onmessage = (e) => { try { cb.current(JSON.parse(e.data)) } catch {} }
      ws.onclose = () => { if (!closed) timer = window.setTimeout(connect, 1500) }
    }
    connect()
    return () => { closed = true; clearTimeout(timer); ws?.close() }
  }, [])
}
