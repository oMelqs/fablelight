export type RollMode = 'pool' | 'd20' | 'sum' | 'd100'

export interface RollRule {
  mode: RollMode
  maxRolled?: number
  maxSummed?: number
  critical?: { pairMin?: number }
  fumble?: 'allOnes'
}

export interface Die { sides: number; value: number }

export interface RollResult {
  kept: Die[]
  discarded: Die[]
  sum: number
  total: number
  high: number
  low: number
  critical: boolean
  fumble: boolean
  success?: boolean
  margin?: number
}

export interface EvalOpts { dt?: number; modifier?: number; advantage?: 'adv' | 'dis' }

export interface SystemConfig {
  dice: number[]
  attributes: { key: string; label: string }[]
  skills: { key: string; label: string; attribute?: string }[]
  fields: { key: string; label: string; type: 'text' | 'select' | 'number'; options?: string[] }[]
  resources: { key: string; label: string }[]
  tracks: { key: string; label: string; min: number; max: number }[]
  conditions: string[]
  roll: RollRule
  difficulties: { label: string; dt: number }[]
}

export type CoverPattern = 'ondas' | 'pontos' | 'grade' | 'raios'
export type CoverTone = 'noite' | 'indigo' | 'brasa'
export interface CampaignConfig {
  tracks?: SystemConfig['tracks']
  cover?: { pattern: CoverPattern; tone: CoverTone; image?: string }
  archived?: boolean
}
/** One row of GET /api/hub. */
export interface HubSummary {
  id: number; sessions: number; pcs: number; last_played: string | null
  next_session: { number: number | null; title: string | null; date: string | null } | null
  last_session: { number: number | null; title: string | null } | null
}

export interface CharacterData {
  fields: Record<string, string | number>
  attributes: Record<string, number>
  skills: Record<string, number>
  marks: Record<string, number>
  resources: Record<string, { cur: number; max: number }>
  tracks: Record<string, number>
}

export interface CreatureStats {
  hp?: number; armor?: number
  attributes?: Record<string, number>; skills?: Record<string, number>
  damage?: string; extra?: Record<string, unknown>
}

export type AudioPreset = { track?: number; ambients?: { id: number; volume: number }[] }

export interface SceneRow {
  points: { title: string; description?: string; context?: string; checks?: { skill: string; dt: number; info?: string; found?: boolean }[] }[]
  audio_preset: AudioPreset
}

export interface MesaState { mode: 'blank' | 'image' | 'text' | 'scene'; title?: string; image?: string; text?: string }

// Rows as returned by /api/:table (JSON columns already parsed)
export interface System { id: number; name: string; config: SystemConfig; created_at: string }
export interface Campaign { id: number; system_id: number; name: string; description: string | null; config: CampaignConfig; created_at: string }
export interface RollRow { id: number; campaign_id: number | null; who: string | null; label: string | null; input: unknown; result: RollResult; created_at: string }
