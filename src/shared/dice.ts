import type { Die, EvalOpts, RollResult, RollRule } from './types'

const byDesc = (a: Die, b: Die) => b.value - a.value

export function evaluate(rule: RollRule, dice: Die[], opts: EvalOpts = {}): RollResult {
  const mod = opts.modifier ?? 0
  const { dt } = opts
  let kept: Die[] = []
  let discarded: Die[] = []
  let critical = false
  let fumble = false
  let sum: number
  let total: number

  if (rule.mode === 'pool') {
    const rolled = dice.slice(0, rule.maxRolled ?? dice.length)
    const sorted = [...rolled].sort(byDesc)
    const n = rule.maxSummed ?? sorted.length
    kept = sorted.slice(0, n)
    discarded = [...sorted.slice(n), ...dice.slice(rolled.length)]
    const pairMin = rule.critical?.pairMin
    if (pairMin !== undefined) {
      const counts = new Map<number, number>()
      for (const d of kept) counts.set(d.value, (counts.get(d.value) ?? 0) + 1)
      critical = [...counts].some(([v, c]) => c >= 2 && v >= pairMin)
    }
    if (rule.fumble === 'allOnes') fumble = kept.length > 0 && kept.every((d) => d.value === 1)
    sum = kept.reduce((s, d) => s + d.value, 0)
    total = sum + mod
  } else if (rule.mode === 'd20' || rule.mode === 'd100') {
    const pool = dice.slice(0, rule.mode === 'd20' && opts.advantage ? 2 : 1)
    const sorted = [...pool].sort(byDesc)
    const pick = opts.advantage === 'dis' ? sorted[sorted.length - 1] : sorted[0]
    kept = pick ? [pick] : []
    discarded = pool.filter((d) => d !== pick).concat(dice.slice(pool.length))
    const v = pick?.value ?? 0
    sum = v
    if (rule.mode === 'd20') {
      total = v + mod
      critical = v === 20
      fumble = v === 1
    } else {
      total = v
      critical = dt !== undefined && v <= dt / 5
      fumble = v >= 96
    }
  } else {
    kept = [...dice]
    sum = kept.reduce((s, d) => s + d.value, 0)
    total = sum + mod
  }

  const values = kept.map((d) => d.value)
  const res: RollResult = {
    kept, discarded, sum, total,
    high: values.length ? Math.max(...values) : 0,
    low: values.length ? Math.min(...values) : 0,
    critical, fumble,
  }
  if (dt !== undefined) {
    if (rule.mode === 'd100') {
      res.success = total <= dt
      res.margin = dt - total
    } else {
      res.success = total >= dt
      res.margin = total - dt
    }
  }
  return res
}

/** Fills values randomly using Math.random. */
export function rollVirtual(_rule: RollRule, dice: { sides: number }[]): Die[] {
  return dice.map((d) => ({ sides: d.sides, value: 1 + Math.floor(Math.random() * d.sides) }))
}
