/** Accent- and case-insensitive text for matching. */
export const norm = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const hhmm = (iso: string) => {
  const d = new Date(iso)
  return isNaN(+d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export const lsGet = (k: string): string | null => { try { return localStorage.getItem(k) } catch { return null } }
export const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }

/** Tiny pub/sub on window events so unrelated components can talk without wiring. */
export const emit = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }))
export const listen = (name: string, fn: (detail: any) => void) => {
  const h = (e: Event) => fn((e as CustomEvent).detail)
  window.addEventListener(name, h)
  return () => window.removeEventListener(name, h)
}

/** In-app confirm dialog and toast, rendered by Workspace. Replaces window.confirm / alert. */
type ConfirmReq = { message: string; okLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }
export const confirmDialog = (message: string, opts: { okLabel?: string; danger?: boolean } = {}) =>
  new Promise<boolean>((resolve) => emit('rpgtable:confirm', { message, ...opts, resolve } satisfies ConfirmReq))
export const toast = (message: string) => emit('rpgtable:toast', message)
export type { ConfirmReq }
