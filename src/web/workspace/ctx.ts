import { createContext, useContext } from 'react'
import type { Campaign, System } from '../../shared/types'
import type { Items } from './data'
import type { Node, PanelType, Zone } from './layout'

export interface OpenSpec { type: PanelType; ref?: number | string; title?: string }
export interface OpenOpts { beside?: boolean; group?: string }

export interface WsApi {
  campaignId: number
  campaign?: Campaign
  system?: System
  items: Items
  reloadItems: () => void
  root: Node
  focus: string | null
  maxGroup: string | null
  activeKey: string | null
  dragging: string | null
  setDragging: (id: string | null) => void
  open: (spec: OpenSpec, opts?: OpenOpts) => void
  activate: (gid: string, tabId: string) => void
  focusGroup: (gid: string) => void
  closeTab: (tabId: string) => void
  closeKey: (key: string) => void
  move: (tabId: string, gid: string, zone: Zone, index?: number) => void
  splitFocus: (gid: string | null, dir: 'row' | 'col') => void
  maximize: (gid: string | null) => void
  closeGroup: (gid: string) => void
  resize: (path: number[], sizes: number[]) => void
  preset: (name: string) => boolean
  layoutNames: { presets: string[]; saved: string[] }
  saveLayout: (name: string) => void
  deleteLayout: (name: string) => void
}

export const WsContext = createContext<WsApi | null>(null)
export const useWs = () => useContext(WsContext)!
