import { db } from './db'


const attrs = [['fisico', 'Físico'], ['mente', 'Mente'], ['espirito', 'Espírito']]
const skills: [string, string, string][] = [
  ['atletismo', 'Atletismo', 'fisico'], ['ladinagem', 'Ladinagem', 'fisico'], ['luta', 'Luta', 'fisico'], ['pontaria', 'Pontaria', 'fisico'], ['vigor', 'Vigor', 'fisico'],
  ['conhecimento', 'Conhecimento', 'mente'], ['mecanismos', 'Mecanismos', 'mente'], ['medicina', 'Medicina', 'mente'], ['percepcao', 'Percepção', 'mente'], ['sobrevivencia', 'Sobrevivência', 'mente'],
  ['disciplina', 'Disciplina', 'espirito'], ['influencia', 'Influência', 'espirito'], ['intuicao', 'Intuição', 'espirito'], ['presenca', 'Presença', 'espirito'], ['trato', 'Trato', 'espirito'],
]

const nucleo = {
  dice: [4, 6, 8, 10, 12],
  attributes: attrs.map(([key, label]) => ({ key, label })),
  skills: skills.map(([key, label, attribute]) => ({ key, label, attribute })),
  fields: [
    { key: 'perfil', label: 'Perfil', type: 'select', options: ['Executor', 'Analista', 'Vigilante'] },
    { key: 'raca', label: 'Raça', type: 'select', options: ['Anão', 'Elfo da Noite', 'Humano'] },
    { key: 'classe', label: 'Classe', type: 'select', options: ['Campeão', 'Duelista', 'Arcanista', 'Guardião', 'Sacerdote'] },
    { key: 'vocacao', label: 'Vocação', type: 'text' },
    { key: 'nivel', label: 'Nível', type: 'number' },
  ],
  resources: [{ key: 'pv', label: 'PV' }, { key: 'pd', label: 'PD' }],
  tracks: [{ key: 'impeto', label: 'Ímpeto', min: 0, max: 10 }],
  conditions: ['−1 passo Físico', '−1 passo Mente', '−1 passo Espírito', 'Sem ação', 'Caído', 'Preso'],
  roll: { mode: 'pool', maxRolled: 4, maxSummed: 3, critical: { pairMin: 6 }, fumble: 'allOnes' },
  difficulties: [
    { label: 'Fácil', dt: 5 }, { label: 'Padrão', dt: 7 }, { label: 'Difícil', dt: 10 },
    { label: 'Muito difícil', dt: 13 }, { label: 'Heroica', dt: 16 },
  ],
}

const d20 = {
  dice: [4, 6, 8, 10, 12, 20, 100],
  attributes: ['For', 'Des', 'Con', 'Int', 'Sab', 'Car'].map((l) => ({ key: l.toLowerCase(), label: l })),
  skills: [],
  fields: [{ key: 'classe', label: 'Classe', type: 'text' }, { key: 'nivel', label: 'Nível', type: 'number' }],
  resources: [{ key: 'pv', label: 'PV' }],
  tracks: [],
  conditions: ['Caído', 'Atordoado', 'Envenenado', 'Amedrontado'],
  roll: { mode: 'd20' },
  difficulties: [
    { label: 'Fácil', dt: 10 }, { label: 'Média', dt: 15 }, { label: 'Difícil', dt: 20 }, { label: 'Muito difícil', dt: 25 },
  ],
}

export function seedDefaults() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM systems').get() as { n: number }
  if (n) return
  const ins = db.prepare('INSERT INTO systems (name, config) VALUES (?, ?)')
  ins.run('Núcleo d4–d12', JSON.stringify(nucleo))
  ins.run('D20 genérico', JSON.stringify(d20))
}
