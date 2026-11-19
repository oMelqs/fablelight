import { useSyncExternalStore } from 'react'
import { audioEngine } from './engine'

export function useAudioState() {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.getState)
}
