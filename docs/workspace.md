# Workspace — especificação da nova interface (19/11/2026)

O usuário escolheu o protótipo **C, Console** (`prototypes/c-console.html`) como base: estética, cores, tipografia, cards e campo de comandos. Ajustes pedidos:

1. **O registro (log) é sobre o jogo**: combate, rolagens, cenas, descobertas, notas. Nada de TV/transmissão. Os comandos `/` operam o jogo (`/dano`, `/cura`, `/rolar`, `/cond`, `/turno`, `/cena`, `/nota`...). Não existe `/tv`.
2. **TV fora por enquanto**: some do shell (sem pílula de TV, sem botões "mandar à TV" na UI principal). A rota `/mesa` e a API `/api/mesa` continuam no código, intocadas.
3. **Explorador de arquivos do Dock** (`prototypes/a-dock.html`, a árvore lateral): árvore da campanha e da biblioteca. Clicar abre o item **dentro do app**, numa aba de editor (como abrir um arquivo no VS Code).
4. **Personalização de tela do Tiles** (`prototypes/b-tiles.html`): o usuário divide, redimensiona, maximiza e fecha painéis, arrasta abas entre grupos e salva layouts nomeados.

## Modelo de layout

Layout é uma árvore persistida (localStorage por campanha, chave `rpgtable:layout:<cid>`):

```ts
type Node = { kind: 'split'; dir: 'row' | 'col'; sizes: number[]; children: Node[] }
          | { kind: 'group'; id: string; tabs: TabRef[]; active: string | null }
type TabRef = { id: string; type: PanelType; ref?: number | string; title?: string }
```

- **Grupo** = faixa de abas + corpo (visual dos `.dock`/`.dtabs` do Console).
- Arrastar uma aba sobre um grupo mostra 5 zonas (centro = juntar, bordas = dividir); soltar cria o split. Grupo vazio é removido e o split se colapsa.
- Gutters entre filhos redimensionam (`sizes` em frações, mínimo ~160px).
- Cada grupo tem menu: dividir à direita, dividir abaixo, maximizar (⌘⇧M / duplo clique na aba), fechar.
- O explorador é uma barra lateral fixa à esquerda (fora da árvore), recolhível com ⌘B, largura redimensionável.
- **Layouts**: presets embutidos *Sessão* (explorador | Registro + composer no centro | Cena e Combate à direita | Ferramentas embaixo), *Combate*, *Preparação*; e "Salvar layout atual como…" (nome inline, sem `prompt()`). Troca por ⌥1…⌥9 e pela paleta ⌘K.

## Tipos de painel

Singletons (no máximo um aberto): `log` (Registro + composer), `scene` (cena ativa ao vivo), `combat` (encontro ativo), `calc` (calculadora), `books` (busca nos livros), `audio` (mixer), `party` (resumo dos PJs).
Editores (um por item, abertos pelo explorador, título = nome do item): `scene-edit`, `encounter`, `character`, `creature`, `note`, `session`, `book` (leitor de capítulo/trecho), `system`.
Biblioteca (também abas): `library-systems`, `library-bestiary`, `library-books`, `library-audio`.

Reaproveitar os componentes atuais (`SceneColumn`, `CombatColumn`, `Calculator`, `CharacterSheet`, `SceneEditor`, `NotesPanel`, `SearchPalette`, `AudioTab`, `BooksTab`, `ChunkView`, páginas da Biblioteca) dentro dos painéis, restilizados. Regras de jogo continuam vindo do sistema configurado.

## Registro (log)

Tabela nova `log_entries`:
`id, campaign_id (FK cascade), session_id (FK set null), kind TEXT ('combat'|'roll'|'scene'|'note'|'system'), text TEXT, data TEXT JSON '{}', created_at`. Exposta no CRUD genérico (json: `data`). `GET /api/log_entries?campaign_id=X` ordenada por id.

- O stream do Console vira o histórico da sessão: hora, linha do comando (quando veio do composer) ou origem ("via Combate"), card de resultado (dano com barra de PV antes/depois, rolagem com dados mantidos/descartados e veredito, cena com título e trecho, nota).
- **Ações feitas nos painéis também registram** (dano/cura no Combate, próximo turno, nova rodada, combatente caído, rolagem confirmada na calculadora, entrar em cena, ponto de memória descoberto). Uma única função `logEvent(kind, text, data)` no cliente.
- Filtros no topo do stream: Tudo · Combate · Rolagens · Cenas · Notas. Agrupamento por sessão (cabeçalho "Sessão 1 — O Farol").
- Desfazer a última entrada de combate (⌘Z fora de inputs) quando ela carrega `data.undo`.

### Comandos do composer
`/dano <alvo> <n>`, `/cura <alvo> <n>`, `/pv <alvo> <n|=n>`, `/cond <alvo> <condição>` (alternar), `/turno`, `/rodada`, `/rolar <dados...> [dt N]` (avaliado pelo `evaluate` do sistema da campanha), `/cena <nome>`, `/nota <texto>`, `/abrir <nome>` (abre item numa aba), `/layout <nome>`. Texto sem `/` vira nota. Autocomplete de comando e de alvo (combatentes do encontro ativo, PJs, cenas). Busca de nomes sem acento e sem diferenciar maiúsculas.

## Explorador

Seções recolhíveis com contagem: **Sessões** (cada sessão com suas cenas), **Encontros**, **Personagens** (PJs, NPCs), **Notas**, e **Biblioteca** (Bestiário, Livros → capítulos, Áudio, Sistemas). Filtro no topo (sem acento). Item ativo destacado; botão `+` por seção cria o item e o abre. Clique abre a aba (ou foca a existente); ⌘clique abre num split à direita. Botão direito: abrir ao lado, renomear inline, excluir (confirmação dentro do app, nada de `confirm()`).

## Atalhos
⌘K paleta (comandos, itens, layouts, trechos de livro) · `/` foca o composer · ⌘B explorador · ⌘\ dividir grupo · ⌘⇧M maximizar · ⌥W fechar aba · ⌥[ ⌥] trocar aba · ⌥1–9 layouts · N próximo turno · D dano no ativo · 1–9 efeitos sonoros · ? folha de atalhos. Fora de inputs.

## Visual
Tokens, cores, fontes, raios e componentes do `c-console.html` (`--bg #141311`, `--panel #1d1b19`, acento índigo `#8f9bff`, ok/crit/bad suaves, Geist + Geist Mono). Fontes servidas localmente (`public/fonts`), com fallback do sistema. Sem cores berrantes; uso noturno. Telas abaixo de ~900px: um grupo por vez com seletor de abas, explorador como gaveta.
