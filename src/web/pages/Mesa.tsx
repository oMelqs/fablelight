import { useEffect, useState } from 'react'
import { getJson, useWs } from '../api'
import type { MesaState } from '../../shared/types'

// TV screen: no controls. Content cross-fades by keying on the state.
export default function Mesa() {
  const [state, setState] = useState<MesaState>({ mode: 'blank' })
  const [idle, setIdle] = useState(false)
  useWs((m) => m.type === 'mesa' && setState(m.state))
  useEffect(() => { getJson<MesaState>('/api/mesa').then(setState).catch(() => {}) }, [])
  useEffect(() => {
    let t = window.setTimeout(() => setIdle(true), 2000)
    const move = () => { setIdle(false); clearTimeout(t); t = window.setTimeout(() => setIdle(true), 2000) }
    window.addEventListener('mousemove', move)
    return () => { clearTimeout(t); window.removeEventListener('mousemove', move) }
  }, [])

  const { mode, title, image, text } = state
  const showImg = (mode === 'image' || mode === 'scene') && image
  const showTitle = mode !== 'blank' && title
  const key = JSON.stringify(state)
  return (
    <div className="mesa" style={{ cursor: idle ? 'none' : 'default', position: 'fixed', inset: 0, padding: 0, display: 'block' }}>
      <style>{`@keyframes mesa-in { from { opacity: 0 } to { opacity: 1 } }
        .mesa-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3vh; padding: 4vw; animation: mesa-in .8s ease both; }
        .mesa-c img { max-width: 100%; max-height: 100%; object-fit: contain; min-height: 0; }
        .mesa-c.over img { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; }
        .mesa-t { font-family: var(--sans); font-size: 7vw; letter-spacing: .08em; text-align: center; text-shadow: 0 0 24px #000, 0 0 8px #000; position: relative; margin: 0; }
        .mesa-p { font-family: var(--sans); font-size: 3.4vw; line-height: 1.5; max-width: 60ch; text-align: center; white-space: pre-wrap; margin: 0; }`}</style>
      {mode !== 'blank' && (
        <div className={'mesa-c' + (showImg && showTitle ? ' over' : '')} key={key}>
          {showImg && <img src={image} alt="" />}
          {showTitle && <h1 className="mesa-t">{title}</h1>}
          {mode === 'text' && text && <p className="mesa-p">{text}</p>}
        </div>
      )}
    </div>
  )
}
