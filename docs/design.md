# RPGTable — Design

Gerenciador de mesa de RPG para o mestre. Local, agnóstico de sistema, várias campanhas num banco relacional. Uso interno.

## Objetivo

Tirar o mestre do caos de abas: numa tela só ele tem a cena preparada, o combate com os números, a calculadora de dados físicos, a busca nos livros, o mixer de áudio e o controle do que aparece na TV.

Fora do escopo agora: login, nuvem, mapa tático com grid, visão dos jogadores, importação de fichas em PDF. A visão dos jogadores virá depois sobre o mesmo WebSocket da tela da TV.

## Stack

| Peça | Escolha | Por quê |
|---|---|---|
| Linguagem | TypeScript em tudo | Uma linguagem; tipos compartilhados entre servidor e tela |
| Servidor | Node 24 + Hono (`@hono/node-server`, `@hono/node-ws`) | Pequeno, REST e WebSocket no mesmo processo |
| Banco | `node:sqlite` (embutido no Node 24) + FTS5 | Sem dependência nativa; um arquivo `data/rpgtable.db` |
| Tela | React 18 + Vite + react-router-dom | O usuário já domina React |
| Estilo | CSS puro com tokens, tema escuro | Sem framework de CSS |
| PDF → texto | `pdftotext` (poppler, já instalado) via `child_process` | Zero dependência JS |
| Visualizar PDF | Leitor nativo do navegador (`/files/x.pdf#page=N`) | Zero dependência |
| Áudio | `HTMLAudioElement` + API de iframe do YouTube | Sem biblioteca de áudio |
| Rodar TS | `tsx` | Dev e produção sem etapa de build no servidor |
| Testes | `node:test` + `tsx` | Sem framework |

## Arquitetura

```
MacBook
├─ servidor (src/server)  porta 4317
│   ├─ /api/*     REST
│   ├─ /ws        WebSocket: estado da tela da mesa (TV)
│   ├─ /files/*   arquivos enviados (data/files)
│   └─ /*         SPA compilada (dist/) em produção
└─ navegador (src/web)
    ├─ /              campanhas + biblioteca
    ├─ /c/:id/...     campanha (sessão ao vivo, preparação, personagens, notas)
    ├─ /biblioteca/...sistemas, bestiário, livros, áudio
    └─ /mesa          tela da TV: só exibe o que o mestre envia
```

Em dev: `npm run dev` sobe `tsx watch` no servidor e o Vite (5173) com proxy para `/api`, `/ws` e `/files`. Em uso: `npm start` compila a tela e sobe só o servidor em `http://localhost:4317`. A TV abre `http://<ip-do-mac>:4317/mesa`.

Pastas:

```
src/shared/   dice.ts (motor de regras de rolagem), types.ts
src/server/   index.ts, db.ts (schema + migração), crud.ts (helper genérico), routes/*.ts, books.ts, ws.ts
src/web/      main.tsx, App.tsx, api.ts, styles.css, pages/*, components/*
data/         rpgtable.db, files/  (fora do controle de versão)
tests/        *.test.ts
```

## Agnóstico de sistema

Um **sistema** é um registro com um JSON de configuração. O app nunca tem regra de jogo fixa no código, exceto os poucos **modos de rolagem** do motor.

```jsonc
// systems.config
{
  "dice": [4, 6, 8, 10, 12, 20],          // dados disponíveis na escala
  "attributes": [{ "key": "fisico", "label": "Físico" }],
  "skills": [{ "key": "luta", "label": "Luta", "attribute": "fisico" }],
  "fields": [                              // campos livres da ficha
    { "key": "perfil", "label": "Perfil", "type": "select", "options": ["Executor","Analista","Vigilante"] },
    { "key": "classe", "label": "Classe", "type": "text" }
  ],
  "resources": [{ "key": "pv", "label": "PV" }, { "key": "pd", "label": "PD" }],   // têm atual/máximo
  "tracks": [{ "key": "impeto", "label": "Ímpeto", "min": 0, "max": 10 }],        // contadores simples
  "conditions": ["−1 passo Físico", "Caído", "Sem ação"],
  "roll": { "mode": "pool", "maxRolled": 4, "maxSummed": 3, "critical": { "pairMin": 6 }, "fumble": "allOnes" },
  "difficulties": [{ "label": "Fácil", "dt": 5 }, { "label": "Padrão", "dt": 7 }]
}
```

A **campanha** acrescenta trilhas próprias em `campaigns.config.tracks` (ex.: Corrupção 0–10, Lealdade −5 a +5). A ficha mostra as trilhas do sistema + as da campanha.

### Motor de rolagem (`src/shared/dice.ts`)

Uma função pura usada pela calculadora (dados físicos digitados) e pelo rolador virtual:

```ts
evaluate(rule: RollRule, dice: { sides: number; value: number }[], opts: { dt?: number; modifier?: number }): RollResult
// RollResult: { kept, discarded, sum, total, high, low, critical, fumble, success?, margin? }
```

Modos:

| Modo | Regra |
|---|---|
| `pool` | Até `maxRolled` dados, soma os `maxSummed` maiores; descartados saem de tudo. RA/RB = maior/menor dos somados. Crítico: dois+ dados mantidos iguais com valor ≥ `pairMin`. Falha crítica: todos os dados = 1. Sucesso: total ≥ DT. (d4–d12) |
| `d20` | 1d20 + modificador vs DT. Crítico 20 natural, falha 1 natural. Vantagem/desvantagem opcional (2d20, maior/menor). |
| `sum` | Soma tudo + modificador vs DT. Sem crítico. Genérico. |
| `d100` | Sucesso se valor ≤ alvo; crítico se ≤ alvo/5; falha crítica ≥ 96. |

## Modelo de dados

Biblioteca (reutilizável): `systems`, `books`, `book_chunks`, `creatures` (com `campaign_id` nulo), `audio` (com `campaign_id` nulo).
Campanha: `campaigns` e tudo que tem `campaign_id`.

```sql
systems(id, name, config JSON, created_at)
campaigns(id, system_id → systems, name, description, config JSON, created_at)

books(id, system_id?, campaign_id?, title, kind 'md'|'pdf', file_path, created_at)
book_chunks(id, book_id → books ON DELETE CASCADE, ord, heading, page?, text)
book_fts  -- FTS5(heading, text) content='book_chunks', tokenize 'unicode61 remove_diacritics 2'

creatures(id, system_id → systems, campaign_id?, name, tier, tags, stats JSON, traits, notes)
  -- stats: { hp, armor, attributes{}, skills{}, damage, extra{} }

audio(id, campaign_id?, name, kind 'track'|'ambient'|'sfx', source 'file'|'youtube', url, file_path, tags, volume, loop)

characters(id, campaign_id → campaigns ON DELETE CASCADE, kind 'pc'|'npc', name, player, data JSON, notes, portrait)
  -- data: { fields{}, attributes{}, skills{}, marks{}, resources{key:{cur,max}}, tracks{} }

sessions(id, campaign_id, number, title, date, summary, status 'planned'|'played')
scenes(id, campaign_id, session_id?, ord, title, read_aloud, gm_notes, points JSON, image, audio_preset JSON, encounter_id?)
  -- points: [{ title, description, context, checks:[{ skill, dt, info, found }] }]
  -- audio_preset: { track?: audioId, ambients: [{ id, volume }] }
encounters(id, campaign_id, name, notes, round, active_id?)
combatants(id, encounter_id → encounters ON DELETE CASCADE, ord, creature_id?, character_id?, name,
           hp_cur, hp_max, armor, conditions JSON, acted, hidden, notes)
notes(id, campaign_id, title, body, tags, pinned, updated_at)
rolls(id, campaign_id, who, label, input JSON, result JSON, created_at)
```

Datas em ISO texto. JSON em colunas `TEXT`; o helper CRUD faz parse/stringify das colunas declaradas como JSON.

## API

CRUD genérico por tabela (helper `crud.ts`), filtrável por query string:

```
GET    /api/:table?campaign_id=1&system_id=2
GET    /api/:table/:id
POST   /api/:table
PATCH  /api/:table/:id
DELETE /api/:table/:id
```
Tabelas expostas: systems, campaigns, books, creatures, audio, characters, sessions, scenes, encounters, combatants, notes, rolls, log_entries. Para `creatures` e `audio`, `?campaign_id=X&library=1` devolve os da campanha + os da biblioteca.

Rotas específicas:

```
POST /api/files                    multipart → { path: "/files/<uuid>.<ext>" }
POST /api/books/:id/import         (re)extrai texto e indexa
GET  /api/search?q=&campaign_id=   busca FTS em livros + notas + criaturas + cenas; devolve trechos com destaque
POST /api/encounters/:id/add       { creature_id | character_id, count? } → cria combatentes copiando PV
POST /api/encounters/:id/next      avança turno/rodada (marca acted, round++ quando todos agiram)
POST /api/campaigns/:id/duplicate-creature/:creatureId   copia criatura da biblioteca para a campanha
GET  /api/mesa  /  POST /api/mesa  estado da tela da TV
WS   /ws                           broadcast { type: 'mesa', state }
```

Estado da mesa: `{ mode: 'blank'|'image'|'text'|'scene', title?, image?, text? }`, guardado em memória no servidor e reenviado a quem conecta.

## Telas do mestre

**Início** (`/`): campanhas (criar, abrir) e atalhos da biblioteca.

**Sessão ao vivo** (`/c/:id/sessao`): três colunas.
1. **Cena**: seletor de cena; texto para ler em voz alta em tipografia grande; pontos de interesse com quadro perícia/DT/informação (marca "encontrada"); notas do mestre; botões "mandar imagem/texto para a TV" e "aplicar áudio da cena".
2. **Combate**: encontro ativo; contador de rodada; lista ordenável de combatentes (PJs e criaturas) com PV −/+, condições, "agiu", ocultar; adicionar do bestiário/PJs; cartões dos PJs com recursos e trilhas editáveis com um clique.
3. **Ferramentas** em abas: **Calculadora** (escolhe dados, digita valores dos dados físicos, DT, modificador → soma, RA, RB, crítico, sucesso; botão "rolar virtual"; histórico), **Livros** (busca), **Áudio** (mixer), **Notas** (rápidas).

Atalhos: `⌘K` abre busca global; `1–9` dispara efeitos sonoros; `Esc` limpa a TV.

**Preparação** (`/c/:id/prep`): sessões e cenas (editor de cena com pontos de interesse, encontro, preset de áudio, imagem), encontros, notas.

**Personagens** (`/c/:id/personagens`): fichas renderizadas a partir do config do sistema; edição inline.

**Biblioteca**: Sistemas (editor do JSON com pré-visualização da ficha e teste da calculadora), Bestiário, Livros (upload MD/PDF, reindexar, abrir na página), Áudio (upload, link do YouTube, tipo, volume).

**Mesa** (`/mesa`): tela cheia, fundo preto, exibe imagem/título/texto com transição suave. Sem controles.

## Áudio

Roda no navegador do mestre (a TV não toca, evita eco).
- **Trilha**: uma por vez, em loop, crossfade de 2s ao trocar.
- **Ambientes**: várias camadas simultâneas em loop, volume individual.
- **Efeitos**: botões de disparo único, sobrepõem.
- **YouTube**: trilhas e ambientes podem ser link; usam a API de iframe (player oculto) com play/pause/volume.
- Volume master, "parar tudo", e "aplicar preset da cena".

## Fases de implementação

1. **Esqueleto**: projeto, servidor, schema completo, CRUD genérico, arquivos, motor de rolagem com testes, layout da tela, início e editor de sistemas, calculadora.
2. **Módulos** (em paralelo, arquivos separados):
   a. Personagens + bestiário + encontros + coluna de combate.
   b. Livros: importação MD/PDF, FTS, busca global ⌘K, leitor.
   c. Áudio: biblioteca + mixer + YouTube + atalhos.
   d. Preparação (sessões, cenas, notas) + coluna de cena + tela da mesa via WebSocket.
3. **Carga e verificação**: script local de carga de uma campanha real (não versionado), teste de ponta a ponta, README.

## Decisões

| Decisão | Razão |
|---|---|
| Local, sem login | Uso interno numa mesa física; a TV e os jogadores entram pela rede da casa |
| `node:sqlite` em vez de better-sqlite3 | Embutido no Node 24, sem compilação nativa |
| Regras de jogo como config + 4 modos de rolagem | Agnóstico sem exigir programar cada sistema |
| Calculadora e rolador usam a mesma função | Uma regra, dois usos |
| Biblioteca vs campanha por `campaign_id` nulo | Relacional sem tabelas duplicadas |
| Áudio só no navegador do mestre | Evita eco e sincronização |
| CRUD genérico | Uma rota cobre 12 tabelas |

## CONVENTIONS

Convenções da Fase 1 para os módulos paralelos. Não renomeie o que está aqui; acrescente.

**Rodar**: `npm run dev` (servidor com `tsx watch` + Vite em 5173), `npm start` (build + servidor em 4317), `npm test`, `npx tsc --noEmit`. Banco em `data/rpgtable.db`; `RPGTABLE_DB` troca o caminho (usado nos testes). O servidor é montado em `src/server/app.ts` (exporta `app`, testável com `app.request()`); `index.ts` só escuta a porta.

**Rotas do servidor**: um arquivo por módulo em `src/server/routes/<nome>.ts` com `export default function (api: Hono) { api.get('/search', ...) }`. Os caminhos são relativos a `/api` (use `'/search'`, não `'/api/search'`). Registro em `app.ts`, no bloco `ROUTE IMPORTS` (um `import` no topo) e no bloco `ROUTE REGISTRATION` (uma linha `nomeRoutes(api)`). As rotas específicas ficam antes do CRUD genérico, que é montado depois do bloco. Para falar com a TV: `import { broadcast, setMesa, getMesa } from '../ws'`. Banco: `import { db, FILES_DIR } from '../db'`. Para uma tabela nova exposta ao CRUD, acrescente-a ao schema e a `TABLES` em `db.ts` (com as colunas JSON). O CRUD converte booleanos em 0/1 e aceita `?col=valor` (ou `null`) em qualquer coluna real.

**Telas**: uma página por arquivo em `src/web/pages/*.tsx` (export default), registrada só em `App.tsx` (já está; substitua o arquivo inteiro). Componentes reutilizáveis em `src/web/components/`; colunas da sessão ao vivo em `components/session/{Scene,Combat,Tools}Column.tsx` (props `{ campaignId }`); conteúdo das abas de ferramentas em `components/tools/{Calculator,Books,Audio,Notes}Tab.tsx` (props `{ campaignId }`). Cada módulo mexe só nos seus arquivos. `CampaignLayout` expõe `{ campaign, system }` via `useOutletContext()`; `useCampaign()` devolve `{ campaignId }`.

**`src/web/api.ts`**: `list(table, params)`, `get`, `create`, `update` (PATCH), `remove`, `getJson(url)`, `postJson(url, body)`, `uploadFile(file)` → `{ path }`, `useWs(onMessage)` (reconecta sozinho; mensagens `{ type, ... }`). Tipos de linha em `src/shared/types.ts`: colunas JSON já chegam como objeto. Motor de rolagem: `evaluate` e `rollVirtual` em `src/shared/dice.ts`; componente `Calculator` (`config: SystemConfig`, `campaignId?`).

**CSS** (`src/web/styles.css`, sem framework): tokens `--bg --surface --surface-2 --border --text --muted --accent` (dourado) `--accent-ink --danger --ok --ice --radius --font --font-read`. Utilitários: `.page .card .grid .grid.cards .grid.two .row .row.wrap .stack .stack-sm .spacer .muted .error .ok-text .btn .btn-primary .btn-danger .btn.block .input .input.num .input.code .tabs .tab(.active) .badge(.crit .fumble .ok .fail) .column .session-grid .read-aloud`. Textos de interface em português do Brasil.
