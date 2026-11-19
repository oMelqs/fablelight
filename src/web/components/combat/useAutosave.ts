import { useEffect, useRef } from 'react'

/** Calls save(value) 600ms after the last change; flushes pending change on unmount. Skips the initial value. */
export function useAutosave<T>(value: T, save: (v: T) => void, ms = 600) {
  const first = useRef(true)
  const key = JSON.stringify(value) // ponytail: compare by content so re-renders with equal objects don't resave
  const pending = useRef<{ v: T } | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    if (first.current) { first.current = false; return }
    pending.current = { v: value }
    const t = setTimeout(() => { pending.current = null; saveRef.current(value) }, ms)
    return () => clearTimeout(t)
  }, [key, ms]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (pending.current) saveRef.current(pending.current.v) }, [])
}
