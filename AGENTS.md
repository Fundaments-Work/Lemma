# Lemma — Agent Guide

## Quick start

```bash
npm ci
npm test              # vitest test suite (100 tests)
npm run build         # typecheck + bundle
npm run lint          # eslint with eslint-plugin-obsidianmd
npm run lint:fix      # auto-fix lint
npm run dev           # dev mode (watch, sourcemaps)
node deploy.mjs <vault-path>   # copy built files to vault
```

## Organization & links

- **Organization**: Fundaments Work
- **Repository**: [Fundaments-Work/Lemma](https://github.com/Fundaments-Work/Lemma)
- **Sponsorship**: [Buy Me Momo](https://buymemomo.com/usefundaments)

## Cross-repo contracts

Facts this repo shares with other repos. The design system is **read-only**
from here: change it in its own repo, never here.

### Buy Me Momo URL

- This repo keeps the literal in five places: `manifest.json` (`fundingUrl`),
  `.github/FUNDING.yml`, `README.md` (badge and links), `FLASHCARD_GUIDE.md`
  and `src/ui/FSRSSettingsTab.ts`. They are deliberate literals: Obsidian reads
  `manifest.json` straight off disk and the rest ship as built artifacts, so
  none of them can depend on another repo at build time.
- Nothing verifies them automatically (the old `check:content` script was
  removed in commit `b2fb66e`). The same URL is used by Theorem and the landing
  sites; every place it appears is listed in the handbook note `Brand/Support
  channels`. Change them all together, or some page ends up advertising a dead
  URL.

### `Fundaments-Work/design-system` — visual language

- **Lemma is deliberately outside the system.** It runs inside someone else's
  application and must inherit that application's theme. Its interface uses
  Obsidian's own CSS variables and nothing more. Its README, badge and release
  surface follow the lab's tokens like any other Fundaments.work page.
- This is a decision, not an omission — do not "fix" it by pulling lab tokens
  into the plugin UI.
- Non-negotiable studio rules still apply to anything published under the
  Fundaments.work name: corner radius `0`, no emojis in release notes and
  official guides, DM Sans/DM Mono at 300/400 only, and official brand marks used
  unchanged (never redrawn, never rotated or rounded).

## Licensing

- **License**: MIT. Releases through v1.1.3 were ISC (OBSD); v1.1.4 onward is MIT
- **Copyright holder**: Fundaments Work, year range `2025-2026`. Never use the legacy
  `Sapienskid` handle in shipped files
- **Single source of truth**: `LICENSE` file. Attribution also appears in `manifest.json`,
  `package.json` (`license: MIT`), the README badge and License section, and the settings
  About tab. Change all of them together
- **Bundled dependencies**: all runtime deps are permissively licensed. Update the version
  table in `THIRD_PARTY_NOTICES.md` whenever a runtime dependency is added or upgraded
- **No per-file license headers**, and no CLA for contributions

## Design plans

- `docs/plans/` holds plans for work that is **in progress**; `docs/plans/done/` holds
  completed ones. Move the file with `git mv` when a feature ships so history is kept
- Update the plan to match what actually shipped when moving it, and set
  `**Status**: Done` with the completion date and shipped version
- Plan documents link issues under the `Fundaments-Work` org, never the legacy handle

## Code conventions

- **Sentence case** for all UI labels: "API configuration", not "API Configuration"
- **Clean documentation**: No emojis in release notes, changelogs, or official guides
- **No comments** unless explaining a non-obvious tradeoff
- **fsrs-** prefix for plugin UI CSS classes in `styles.css`
- **DataManager** owns all state; UI classes read from it, never duplicate state
- Settings are read/written through `plugin.settings` + `plugin.saveSettings()`
- Save settings immediately on every `onChange`, don't batch
- Use `isRecord()` and `getErrorMessage()` for safe unknown-type handling

## Architecture

```
main.ts                   # Re-exports from src/plugin/main
src/
├── plugin/
│   └── main.ts           # Plugin lifecycle, commands, ribbon, debounced vault events
├── data/
│   ├── DataManager.ts    # State orchestration, mtime caching, tag parsing, FSRS scheduling
│   ├── backup.ts         # Backup file format: build, parse and validate (also reads old data.json)
│   ├── importCards.ts    # Anki text / CSV -> Lemma Markdown converter
│   ├── constants.ts      # Constants, defaults, database name resolution, Lucide-standard SVG icon, hash utilities
│   └── types.ts          # Type definitions (Card, Deck, FSRS, Settings)
├── database/
│   ├── PouchDBManager.ts # IndexedDB storage + live CouchDB sync
│   └── DataMigration.ts  # Legacy data.json -> PouchDB migration
└── ui/
    ├── DashboardView.ts  # ItemView — deck list, stats, action bar
    ├── ReviewModal.ts    # Study session with swipe gestures and in-place image peek
    ├── ReviewNoteModal.ts# Whole-note (#review) study session
    ├── BrowseModal.ts    # Card search and browser
    ├── StatsModal.ts     # Chart.js analytics and forecast
    ├── CustomStudyModal.ts# Filtered study queue
    ├── CreateCardModal.ts# Guided card creation with live preview
    ├── CreateDeckModal.ts# Guided deck creation modal
    ├── ImportBackupModal.ts # Pick and merge a review data backup
    ├── ImportCardsModal.ts  # Pick a file and create a deck note from it
    ├── HelpModal.ts      # In-app markdown documentation viewer
    ├── ResetProgressModal.ts # Progress reset modal
    └── FSRSSettingsTab.ts# 4-tab settings interface
```

## Important patterns to follow

### Settings tab
Use the 4-tab pattern from `FSRSSettingsTab`:
- Tab nav uses `lemma-tab-*` CSS classes
- Each tab is a private `renderXxxTab(containerEl)` method
- Use `new Setting(containerEl).setName(...).setHeading()` for section titles
- No manual `<h3>` or HTML headings in settings

### Performance & vault events
- `vault.on('modify')` and `vault.on('create')` batch files into a `pendingModifiedFiles: Set<TFile>` debounced at 350ms to eliminate typing latency
- `DataManager.hasTag()` performs zero-allocation checks against `metadataCache`
- `DataManager.updateFile()` checks `file.stat.mtime` against cached timestamps to skip unchanged notes without reading disk
- Heading breadcrumbs are pre-computed in a single $O(N)$ pass (`buildHeadingBreadcrumbs`) for $O(1)$ lookup per card

### In-app vector icon
- Registered via `addIcon(LEMMA_ICON_ID, LEMMA_ICON_SVG)`
- Must follow Obsidian Lucide specification (`0 0 100 100` viewBox, `stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"`)
- Do not apply `stroke: none` to `svg.lemma-icon` in `styles.css`

### Card syntax & formats
1. **Basic**: `---card---` followed by `---` divider and optional `---end---`
2. **Single-line**: `Question::Answer`
3. **Reversed**: `Question:::Answer`
4. **Cloze deletion**: `==c1::hidden text==`
5. **In-place image occlusion**: `![[image-front.png]]::![[image-back.png]]` (auto-detected, in-place peek toggle)
6. **Type-in active recall**: `?type` flag in single-line (`Q::A ?type`) or block format (`---card--- ?type`)
7. **Whole-note review**: `#review` tag in frontmatter or body

### Card IDs
- With block ID (`^abc123`): `deckId::blockId`
- Without: `cyrb53hex(filePath + '::' + front)` or `cyrb53hex(filePath + '::' + paragraph + '::' + clozeNum)`

### FSRS state machine
- `State.New` -> no fsrsData or state is New
- `State.Learning` / `State.Relearning` -> counts as "learning"
- `State.Review` -> stability < 21 = "young", >= 21 = "mature"

### Sync
- PouchDB sync is live+retry by default
- Manual sync available via dashboard button and settings test
- Credentials embedded in URL (sanitized for logging)
- Fatal HTTP statuses (401/403/404) cancel sync

## Testing

Validate by:
1. `npm test` (Vitest: 100 tests covering card parsing, data manager, image occlusion, PouchDB persistence, renames, scheduling, undo, backup, import, 1.1.5 data compatibility and the review window)
2. `npm run lint` (ESLint: strict Obsidian plugin rules, zero warnings/errors required)
3. `npm run build` (TypeScript check + esbuild production bundle)
4. `node deploy.mjs <vault-path>` (deploy to test vault)

## Release

Pushing a semver tag without `v` prefix (e.g. `1.1.3`) triggers `.github/workflows/release.yml`:
Validates semver -> checks manifest version -> installs with `npm ci` -> audits production dependencies -> tests -> lints -> builds -> attests -> creates GitHub release with `main.js`, `manifest.json`, `styles.css`.

The release workflow and the community review scanner both install with `npm ci` and build with npm. `package-lock.json` is the only committed lockfile, so the scanner uses its frozen npm path instead of the pnpm fallback.

**Do not push release tags unless explicitly asked.**
