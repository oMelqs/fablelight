<p align="center"><img src="public/icon.svg" width="96" alt="Fablelight"></p>

<h1 align="center">Fablelight</h1>

<p align="center">A mesa de trabalho do mestre de RPG · The game master's workstation</p>

<p align="center"><a href="#português">Português</a> · <a href="#english">English</a></p>

---

## Português

Fablelight junta numa tela só o que o mestre usa durante a sessão: registro da sessão com comandos, cena preparada, combate, calculadora para os dados físicos, busca nos livros e mixer de áudio. Funciona com qualquer sistema de RPG e com várias campanhas. Roda no seu computador, sem conta e sem nuvem.

### Recursos

- **Registro da sessão**: tudo o que acontece no jogo fica numa linha do tempo (dano, cura, condições, turnos, rolagens, cenas, notas). Comandos como `/dano carniçal 5`, `/rolar 6 4 3 dt 10`, `/cena farol` e `/nota` operam o jogo direto do teclado. `⌘Z` desfaz o último dano.
- **Explorador**: sessões, cenas, encontros, personagens, notas e biblioteca numa árvore. Cada item abre numa aba, como um arquivo num editor de código.
- **Tela do seu jeito**: divida, redimensione, maximize e arraste abas entre painéis. Salve layouts com nome e troque com `⌥1`–`⌥9`.
- **Combate**: iniciativa, PV com armadura, condições, rodadas e botões rápidos.
- **Calculadora de dados físicos**: digite o que caiu na mesa e ela aplica a regra do sistema (soma, maiores dados, crítico, falha, DT).
- **Livros**: importe Markdown ou PDF e busque em segundos, ignorando acentos.
- **Áudio**: trilha, ambientes e efeitos sonoros (arquivos locais ou YouTube), com efeitos nas teclas `1`–`9`.
- **Agnóstico de sistema**: cada sistema é um JSON com atributos, perícias, recursos, trilhas, condições, dificuldades e modo de rolagem (`pool`, `d20`, `sum`, `d100`). Fichas e calculadora se adaptam.

### Instalação

Requer [Node.js](https://nodejs.org) 24 ou mais recente.

```bash
git clone https://github.com/oMelqs/fablelight.git
cd fablelight
npm install
npm start        # compila e abre em http://localhost:4317
```

No macOS também dá para abrir com dois cliques em `Fablelight.command`.

Os dados ficam em `data/` (banco SQLite e arquivos enviados). Para fazer backup, copie essa pasta.

### Atalhos

| Atalho | Ação |
|---|---|
| `⌘K` | Paleta: comandos, itens, layouts e trechos dos livros |
| `/` | Foca o campo de comandos |
| `⌘B` | Mostra ou esconde o explorador |
| `⌘\` · `⌘⇧M` | Divide o painel · maximiza |
| `N` · `D` | Próximo turno · dano no combatente ativo |
| `1`–`9` | Efeitos sonoros |
| `?` | Lista de atalhos |

### Desenvolvimento

```bash
npm run dev        # Vite (5173) + servidor com reload
npm test           # testes (node:test)
npm run typecheck  # TypeScript
```

Stack: Node 24 (`node:sqlite` + FTS5), Hono, React 18, Vite e CSS puro. Arquitetura e convenções em [`docs/design.md`](docs/design.md), interface em [`docs/workspace.md`](docs/workspace.md) e sistema visual em [`DESIGN.md`](DESIGN.md).

Contribuições são bem-vindas: abra uma issue ou um pull request.

### Licença

Código sob a [licença MIT](LICENSE). As fontes Geist e Geist Mono seguem a [SIL Open Font License](public/fonts/OFL.txt).

---

## English

Fablelight puts everything a game master reaches for during a session on one screen: a session log driven by commands, the prepared scene, combat, a calculator for physical dice, book search and an audio mixer. It works with any tabletop RPG system and multiple campaigns. It runs on your own computer, with no account and no cloud.

The interface is in Brazilian Portuguese for now.

### Features

- **Session log**: everything that happens in the game lands on a timeline (damage, healing, conditions, turns, rolls, scenes, notes). Commands such as `/dano goblin 5`, `/rolar 6 4 3 dt 10`, `/cena` and `/nota` run the game from the keyboard. `⌘Z` undoes the last damage.
- **Explorer**: sessions, scenes, encounters, characters, notes and library in a tree. Each item opens in a tab, like a file in a code editor.
- **Your layout**: split, resize, maximize and drag tabs between panels. Save named layouts and switch with `⌥1`–`⌥9`.
- **Combat**: initiative, HP with armor, conditions, rounds and quick buttons.
- **Physical dice calculator**: type what landed on the table and it applies the system's rule (sum, highest dice, critical, fumble, difficulty).
- **Books**: import Markdown or PDF and search in seconds, accent-insensitive.
- **Audio**: music, ambience and sound effects (local files or YouTube), with effects on keys `1`–`9`.
- **System-agnostic**: each system is a JSON file with attributes, skills, resources, tracks, conditions, difficulties and a roll mode (`pool`, `d20`, `sum`, `d100`). Sheets and calculator adapt to it.

### Install

Requires [Node.js](https://nodejs.org) 24 or newer.

```bash
git clone https://github.com/oMelqs/fablelight.git
cd fablelight
npm install
npm start        # builds and serves http://localhost:4317
```

On macOS you can also double-click `Fablelight.command`.

Data lives in `data/` (SQLite database and uploaded files). Copy that folder to back it up.

### Development

```bash
npm run dev        # Vite (5173) + server with reload
npm test           # tests (node:test)
npm run typecheck  # TypeScript
```

Stack: Node 24 (`node:sqlite` + FTS5), Hono, React 18, Vite and plain CSS. Architecture notes are in [`docs/design.md`](docs/design.md) (Portuguese).

Contributions are welcome: open an issue or a pull request.

### License

Code under the [MIT License](LICENSE). The Geist and Geist Mono fonts are under the [SIL Open Font License](public/fonts/OFL.txt).
