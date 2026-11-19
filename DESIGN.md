---
name: Fablelight
description: The game master's console. A warm near-black tiling workspace for running a tabletop session without leaving the screen.
colors:
  ground: "#141311"
  chrome: "#191816"
  panel: "#1d1b19"
  raise: "#262421"
  raise-high: "#2f2c28"
  hairline: "#34312c"
  hairline-strong: "#47433c"
  text: "#efece6"
  prose: "#e4e0d8"
  dim: "#aaa59b"
  faint: "#948f85"
  indigo: "#8f9bff"
  indigo-wash: "rgba(143, 155, 255, .14)"
  indigo-light: "#b4bcff"
  ink-on-indigo: "#12121c"
  ok: "#86cf98"
  crit: "#f0c85a"
  bad: "#f27f74"
typography:
  title-editor:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-.01em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-.01em"
  read-aloud:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    letterSpacing: "normal"
  numeral-big:
    fontFamily: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-.03em"
  mono:
    fontFamily: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
    fontFeature: "tnum"
rounded:
  key: "4px"
  control: "6px"
  card: "8px"
  dock: "10px"
  float: "12px"
  pill: "12px"
spacing:
  hair: "2px"
  tight: "6px"
  gap: "10px"
  pane-y: "12px"
  pane-x: "14px"
  section: "26px"
components:
  button:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "30px"
  button-hover:
    backgroundColor: "{colors.raise-high}"
  button-primary:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.ink-on-indigo}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "30px"
  button-primary-hover:
    backgroundColor: "{colors.indigo-light}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dim}"
    rounded: "{rounded.control}"
    height: "30px"
  button-small:
    height: "26px"
    padding: "0 9px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 9px"
    height: "30px"
  dock:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.dock}"
  dock-tabstrip:
    backgroundColor: "{colors.chrome}"
    padding: "5px 6px"
    height: "42px"
  dock-tab-selected:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "30px"
  explorer:
    backgroundColor: "{colors.chrome}"
    width: "270px"
  explorer-item-active:
    backgroundColor: "{colors.indigo-wash}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "26px"
  composer:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.text}"
    rounded: "{rounded.float}"
    padding: "0 8px 0 16px"
    height: "48px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.card}"
    padding: "12px 14px"
  plate:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.prose}"
    typography: "{typography.read-aloud}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.dim}"
    typography: "{typography.mono}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "24px"
  chip-on:
    backgroundColor: "{colors.indigo-wash}"
    textColor: "{colors.indigo-light}"
  pill:
    backgroundColor: "{colors.raise-high}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "24px"
  segmented:
    backgroundColor: "{colors.chrome}"
    rounded: "{rounded.card}"
    padding: "2px"
  segmented-on:
    backgroundColor: "{colors.raise-high}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "24px"
  die-tile:
    backgroundColor: "{colors.raise-high}"
    textColor: "{colors.text}"
    rounded: "7px"
    size: "32px"
  menu:
    backgroundColor: "{colors.raise}"
    rounded: "{rounded.card}"
    padding: "4px"
  dialog:
    backgroundColor: "{colors.raise}"
    rounded: "{rounded.float}"
    width: "min(640px, 92vw)"
---

# Design System: Fablelight

## Overview

**Creative North Star: "The GM's Console"**

Fablelight is a tiling workspace, built like a code editor and run like a command line. A fixed explorer on the left holds the campaign and library as a tree; the rest of the screen is a user-arranged layout of docks, each a tab strip over a body, split, resized, maximized and saved as named layouts. The Registro (log) is the spine: a timestamped stream of game events with a command composer at its foot, where `/dano`, `/rolar`, `/cena` act on the game and every panel action writes back to the same stream.

The room is dark and the screen sits near the players, so the palette is warm near-black with low-chroma status colors and a single soft indigo for intent. Density is high but quiet: 13.5px body, 26px tree rows, hairline borders, sentence-case labels. Big type is reserved for two things only, the read-aloud narration and the number that just came off the dice. Everything numeric is tabular; commands, dice, counts and values sit in Geist Mono.

The user rejected an earlier flat "Min Dark" pass as lifeless and asked for no loud colors and night use. This system answers that with tonal warmth, tinted outcome cards and small amounts of springy motion on value changes, never with saturation.

**Key Characteristics:**
- Warm near-black surface ladder (ground, chrome, panel, raise, raise-high), separated by 1px warm hairlines.
- One accent, soft indigo, for focus, selection, active turn, the prompt and the primary action.
- Three muted status colors (ok, crit, bad) carried as 7–8% tints with 30–40% borders.
- Geist for interface, Geist Mono for every number and command; both served locally.
- Tiling docks with 10px corners floating on the ground with 6px gutters.
- Motion is short ease-out rises for things that appear, and a spring only for meters and switches.

## Marca

Name: Fablelight (formerly RPGTable, then Fablelight). Direction A, "a lanterna do mestre", chosen 19/11/2026; reference in prototypes/marca.html.

- Symbol: lantern outline (handle, roof, two posts, base) in `--text`, 2.5 stroke at 32px, with an `--ac` flame. Component: `src/web/components/Logo.tsx` (symbol + lowercase "fablelight" wordmark, Geist 600, -0.7 tracking). Top bar renders it at 24px.
- Favicon: `public/favicon.svg`, symbol only, stroke 3.2 for 16px legibility.
- App icon: `public/icon.svg` (+ `icon-512.png`, `apple-touch-icon.png`), symbol on a warm dark tile with a faint indigo glow; `manifest.webmanifest` uses `--chrome` as theme color.
- Icon family (`Icon.tsx`): 16px grid, 1.5 stroke, round caps and joins, outlines with radius-2 corners, no fills. A light dot (`h.01` path) marks key icons (log, scene, users, dice). Icons A did not define (arrows, plus, trash, play, eye, etc.) are redrawn in the same rules. Sheet: prototypes/icons.html.
- In-app vocabulary is unchanged by the rebrand.
- Intentionally not renamed: package name, `rpgtable:*` localStorage keys and custom events, `RPGTABLE_DB`, `data/rpgtable.db`, folder name, docs/design.md internals.

## Colors

A warm, desaturated dark ladder with one cool accent and three soft status hues; nothing on screen is brighter than the off-white text.

### Primary
- **Console Indigo** (indigo): focus outlines (2px, 2px offset), focused input borders, the `›` prompt in the composer and log commands, the selected dock-tab underline, active-turn chip, primary button fill, resize gutters on hover (75% opacity), drop zones.
- **Indigo Wash** (indigo-wash): background of selected things that are not buttons: the active explorer item, active combatant row, selected suggestion and palette row, chip-on, the 3px focus halo around inputs and the composer.
- **Pale Indigo** (indigo-light): text on indigo-wash, links, hover of a primary button, the active combatant's name, the current item in menus.
- **Ink on Indigo** (ink-on-indigo): text on any solid indigo fill.

### Secondary
- **Kept Green** (ok): success verdicts, HP bars above the low threshold, healing deltas, the saved indicator, switches turned on, found checks.
- **Critical Gold** (crit): critical results, kept dice, DT labels, GM-only labels, search-hit `mark`.
- **Wound Coral** (bad): failures, damage deltas, low HP bars, danger buttons and destructive menu items, inline errors.

### Neutral
- **Ground** (ground): app background, the log column, inputs (inputs sit darker than the panel they live in).
- **Chrome** (chrome): top bar, explorer, dock tab strips, segmented-control tracks, list sidebars inside panels, sticky nav bars.
- **Panel** (panel): dock bodies, cards, tiles, GM-note backing.
- **Raise** (raise): hover fill, selected tab, buttons, menus, the composer, read-aloud plates, dialogs.
- **Raise High** (raise-high): button hover, pills, die tiles, segmented "on", toasts, context menus.
- **Hairline** (hairline) and **Strong Hairline** (hairline-strong): every border; strong for hover, focused docks, floating surfaces and dashed empties.
- **Text** (text), **Prose** (prose), **Dim** (dim), **Faint** (faint): primary text; long-form narration and markdown; secondary text and labels; placeholders, counts, timestamps and idle icons.

### Named Rules
**The One Indigo Rule.** Indigo is the only color that means "you, here, now": focus, selection, the active turn, the prompt. No second UI hue exists; if something needs emphasis and it is not a game outcome, it gets indigo or nothing.

**The Outcome-Only Status Rule.** Green, gold and coral describe what happened in the game (and save/error state). They never decorate. Outcome cards carry them as a tint (`linear-gradient` of the color at 7–8% over panel) with a 30–40% alpha border; text in the full color is limited to the verdict, deltas and small tags.

**The Warm Ladder Rule.** Depth goes ground → chrome → panel → raise → raise-high, each a few points warmer and lighter. No cool grays, no pure black in the console (the `/mesa` TV route is outside this system).

## Typography

**Display Font:** none; the system has no display face.
**Body Font:** Geist (with ui-sans-serif, system-ui, -apple-system, Segoe UI)
**Label/Mono Font:** Geist Mono (with ui-monospace, SF Mono, Menlo)

**Character:** A neutral, engineered sans with its own mono sibling, so the command line, the dice and the prose read as one family. Weight does the hierarchy (400/500/600, 700 only for the brand mark); size stays in a tight band.

### Hierarchy
- **Editor title** (600, 28px, 1.2, -.02em): the editable name at the top of an editor tab; drops to 22px when the pane is under 560px wide. Book chapter titles use 26px.
- **Headline** (600, 20px, -.01em): page h1, markdown h2. Scene title in the live scene panel is 18px.
- **Title** (600, 16px, -.01em): card titles in the log, h2, campaign names (17px in library cards).
- **Read-aloud** (400, 16px, 1.65, max 62–70ch, prose color, `text-wrap: pretty`): narration plates and editor plates; 15–15.5px with 1.6–1.7 for markdown and log card excerpts.
- **Body** (400, 13.5px, 1.45): all interface text. Tree rows, tabs and secondary controls run at 12.5px.
- **Label** (600, 12.5px, dim, sentence case): pane and section headers, explorer section titles, field groups. Field captions are 500 at 12px.
- **Numeral big** (Geist Mono 500, 44px, 1, -.03em): the roll total in the calculator; 34px in log roll cards.
- **Mono** (Geist Mono 400–600, 11–14px): commands and composer input (13.5–14px), dice and die tiles (14px/600), chips, counts, timestamps (11.5px), kbd keys (11px).

### Named Rules
**The Numbers Are Mono Rule.** `font-variant-numeric: tabular-nums` is set on the root; any value a GM compares at a glance (HP, totals, dice, counts, page numbers, times) is also set in Geist Mono.

**The Two Big Things Rule.** Only narration and the latest roll total get large type. Panel titles stay at 12.5–18px no matter how much room the dock has.

**The Sentence-Case Label Rule.** Section labels are 12.5px/600 in dim, sentence case, no tracking. The system has no uppercase labels.

## Layout

The app is a two-row grid: a 46px chrome top bar (brand, campaign switcher, system name, session clock, Layout menu, explorer toggle, search with ⌘K, help) over the body. The body is the explorer (default 270px, user-resizable through a 6px gutter, collapsible with ⌘B) beside the layout tree.

The tree is a recursive split of rows and columns with fractional sizes; leaves are docks. The tree area has 6px padding and children are separated by 6px gutters that show an indigo bar at 75% on hover or drag, so docks read as separate tiles floating on the ground. A maximized dock takes the whole tree area (inset 6px). Dragging a tab over a dock shows five drop zones (four 25% edges to split, center to merge) as dashed outlines that fill with indigo-wash and a 2px indigo outline when targeted.

Every dock body is an inline-size container, so panels respond to their own width: editor content caps at 900px (1160px wide variant) with 24px 32px padding and 26px section gaps, switches to a main + 300px side column from 860px, two-column skill grids from 760px, a book TOC from 920px, and tightens padding under 560px; session panels tighten under 380px. Panel content uses 12px 14px padding and 6–10px internal gaps.

Below 900px the workspace shows one dock at a time (the focused one, full area) with the tab strip as the selector, and the explorer becomes an overlay drawer (min(86vw, 320px)) with a large soft shadow. The system name, clock and keyboard hints drop out of the top bar.

## Elevation & Depth

Hybrid: tonal layering does the structural work and shadows mark only what floats above the layout. Docks and the explorer are flat, separated by hairlines and gutters. A focused dock only strengthens its border. Log cards and editor cards carry a faint resting lift (inner top highlight plus a soft 14px drop) to read as event records on the darker log ground. Menus, popovers, the composer, toasts and dialogs carry real, dark, diffuse shadows. Focus is a 3px indigo-wash halo on fields and a 2px indigo outline on everything else.

### Shadow Vocabulary
- **Record** (`box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 4px 14px rgba(0,0,0,.18)`): log event cards and editor cards. `.flat` cards drop it.
- **Composer** (`box-shadow: 0 8px 28px rgba(0,0,0,.35)`): the command field at the foot of the log.
- **Menu** (`box-shadow: 0 16px 40px rgba(0,0,0,.5)`): dropdowns, add menus, suggestion list (inverted, `0 -14px 40px`).
- **Context** (`box-shadow: 0 14px 36px rgba(0,0,0,.55)`): right-click menus.
- **Toast** (`box-shadow: 0 10px 30px rgba(0,0,0,.5)`).
- **Maximized dock** (`box-shadow: 0 20px 60px rgba(0,0,0,.6)`) and **drawer** (`0 0 60px rgba(0,0,0,.6)`).
- **Dialog** (`box-shadow: 0 28px 80px rgba(0,0,0,.65)`): ⌘K palette, shortcut sheet, confirm, over a `rgba(10,9,8,.6)` scrim.
- **Focus halo** (`box-shadow: 0 0 0 3px var(--ac2)`): inputs, plates, tag fields, composer, a dock being dropped onto.

### Named Rules
**The Float-Only Rule.** Shadows belong to things that sit above the layout or to event records in the log. Docks, rows and the explorer never get a drop shadow.

## Shapes

Soft, small, consistent corners on a 1px hairline grid. Radius grows with the size and independence of the object: 3–4px for keys, badges and focus outlines; 6px for buttons, inputs, tabs and tree rows; 8px (`--r`) for cards, menus, plates and segmented tracks; 10px for docks and the calculator result; 12px for the composer and dialogs; full-round pills and chips (radius = half height). Die tiles are 32px squares at 7px.

Border language carries meaning. Solid hairline is structure. Dashed means empty, placeholder or discarded: empty log and editor states, idle calculator result, dropped dice, drop zones, the "add condition" selector. A 2px left rule in strong hairline marks GM-only notes. A 2px inset indigo edge marks the current item in a list (bottom edge on dock tabs, left edge on book TOC and library lists). kbd keys have a 2px bottom border.

## Components

### Buttons
Quiet, compact and tactile; they press down 1px.
- **Shape:** gently rounded (6px), 30px tall, 26px small; icon buttons are square (30 or 26px).
- **Default:** raise fill, hairline border, 500 weight; hover moves to raise-high with a strong hairline. Transitions 0.15s on background and border, 0.1s on transform.
- **Primary:** indigo fill, ink text, 600 weight; hover to pale indigo. Disabled primary falls back to the default look in dim text, never a faded indigo.
- **Ghost:** transparent, dim text; hover gets raise fill. Pressed toggles (`aria-pressed`) turn pale indigo.
- **Danger:** transparent with coral text and a 35% coral border; hover adds a 10% coral wash. Combat damage and heal buttons use the same recipe in coral and green.

### Chips and Pills
- **Command and value chips:** 24–26px, full round, transparent with a hairline, mono 12px in dim; hover raises; selected uses indigo-wash, indigo border and pale-indigo text.
- **Pills:** 20–24px, full round, raise-high fill, 11.5–12.5px/500. Conditions on combatants; removable pills carry a 16px round × button.
- **Tags:** 18px round-ended tags in a status color at 10–12% for history verdicts.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** panel; outcome variants tint with ok/crit/bad (see Colors).
- **Shadow Strategy:** the Record shadow in the log and editors; none elsewhere.
- **Border:** 1px hairline.
- **Internal Padding:** 12px 14px (log, editor), 14px 16px (generic card), 10px 12px (sheet tiles).

### Inputs / Fields
- **Style:** 30px, ground fill (darker than the panel), hairline border, 6px radius (8px in editors). Workspace inputs are set in mono with sans placeholders.
- **Hover / Focus:** strong hairline on hover; indigo border on focus, plus the 3px indigo-wash halo in editors. No outline.
- **Inline titles:** editor and point titles are borderless text with a transparent bottom border that becomes hairline on hover and indigo on focus.
- **Segmented control:** chrome track with 2px padding and an 8px radius; 24px options, the "on" option in raise-high.
- **Switch:** 30×18 track, 12px knob that springs across; on state is green.

### Navigation
- **Explorer:** chrome column. Collapsible sections (12.5px/600 dim headers with a rotating chevron and a faint mono count), indented items at 26px (14/26/40px indents), faint 16px line icons. Hover is raise; the open item is indigo-wash with its icon in pale indigo. Per-row actions (+, menu) appear on hover at 22px. Inline rename uses a ground field with an indigo border.
- **Dock tab strip:** chrome, 42px, horizontally scrolling without a scrollbar. Tabs are 30px, dim 500; hover and selected get raise, selected adds a 2px indigo bottom inset; the close × is visible only on hover or selection. A 2px indigo bar marks the insertion point while dragging. Group actions (split right, split down, maximize, close) are faint ghost icon buttons at the right end.
- **Top bar:** brand (9px indigo rounded square + 700 15px wordmark), campaign switcher divided by a hairline, session clock with a mono value, ghost buttons, and a search button showing its ⌘K key.

### Registro (log stream and composer)
The signature component. Each event is a two-column row: a 48px mono timestamp gutter and a body. The body opens with the command line in mono (indigo `›` prompt, command text, and a right-aligned faint "via Combate" origin) followed by a result card: roll (big total, verdict, mono die tiles with kept dice in gold and discarded dice dashed and struck), damage (name, coral or green delta, an HP bar that springs from before to after, mono value), scene (title and a six-line clamped excerpt), or note. Session headers are 12px/600 dim with a hairline underline. Filters sit in a segmented control above the stream; undone entries fade to 50%. New entries rise 8px and fade in over 0.45s.

The composer is a 48px raise field with a 12px radius, strong hairline, the Composer shadow and a 16px indigo `›` prompt; on focus it gains an indigo border and the halo. Below it, mono command chips and a faint mono hint; above it, the suggestion list opens upward with command names in mono and descriptions in dim.

### Combat initiative list
Rows on a 2px gap with an 8px radius: name (600), a small bordered armor tag, a 5px HP bar under the name, and a 15px/600 HP value with a dim max. The active combatant gets indigo-wash and a pale-indigo name; the selected one a strong hairline (indigo when both); acted rows fade to 50%; hidden ones go faint italic. The round counter is an indigo-wash capsule with pale-indigo text.

### Dialogs and menus
Menus and the ⌘K palette sit on raise with a strong hairline and pop in (4px rise, 0.15–0.25s, ease-out). Palette rows are 7px-radius buttons with a 600 heading, a dim two-line snippet, and indigo-wash when selected; the footer lists keys. Destructive actions confirm inside a 420px dialog, never through the browser.

## Do's and Don'ts

### Do:
- **Do** build every surface from the warm ladder tokens (`--bg`, `--chrome`, `--panel`, `--raise`, `--raise2`) and 1px `--line`/`--line2` hairlines.
- **Do** keep indigo for focus, selection, the active turn, the prompt and the one primary action in a view.
- **Do** show game outcomes as 7–8% tints with 30–40% borders, putting the full status color only on the verdict, deltas and tags.
- **Do** set every comparable number in Geist Mono with tabular figures.
- **Do** cap narration at 62–70ch, 15–17px, line-height 1.6–1.7, in the prose color.
- **Do** make panels respond to their dock width with container queries, never to the viewport.
- **Do** use `--out` (cubic-bezier(.16,1,.3,1)) for things that appear and `--spring` (cubic-bezier(.25,1.45,.45,1)) only for HP bars and switches; keep state transitions at 0.15s and honor reduced motion.
- **Do** use dashed borders for empty, idle, discarded and drop-target states only.
- **Do** confirm, rename and name layouts inline or in an in-app dialog.

### Don't:
- **Don't** add a second accent hue or any saturated color; the brand commitment is no loud color and night use.
- **Don't** use status colors as decoration, section color-coding or solid fills.
- **Don't** put drop shadows on docks, rows, lists or the explorer.
- **Don't** set labels in uppercase or with positive tracking; labels are sentence case, 12.5px/600, dim.
- **Don't** enlarge panel titles to fill a wide dock; only narration and roll totals get big type.
- **Don't** use typed glyph characters (‹ › ★ ▸) as icons; icons are the 16px, 1.5-stroke line set in `Icon.tsx`, colored by `currentColor`.
- **Don't** use `confirm()` or `prompt()`.
