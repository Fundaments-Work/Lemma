# Lemma — Project status

## Current state (v1.1.4)

All core features are implemented and functional:

### Phase 1 — Foundation (completed)
- [x] Modular code structure (`src/data/`, `src/ui/`, `src/plugin/`)
- [x] Test suite — Vitest, 46 tests, Obsidian + PouchDB mocks
- [x] Single-line card syntax (`Q::A` basic, `Q:::A` reversed)
- [x] Stable block IDs for single-line cards (`^blockId` suffix)
- [x] Whole-note review (`#review` tag system)
- [x] Daily review limits with cross-session load balancing
- [x] Card context breadcrumbs (heading hierarchy displayed in review)
- [x] FSRS 4.5 scheduling (ts-fsrs)
- [x] Basic card format (`---card---`)
- [x] Cloze deletion format (`==c1::text==`)
- [x] Dashboard with deck list, folder grouping, stat pills
- [x] Full-screen review modal with keyboard shortcuts + swipe gestures
- [x] Card browser (browse modal)
- [x] Statistics (30-day activity + 7-day forecast charts)
- [x] Custom study sessions (filter by tag, state, limit)
- [x] PouchDB/IndexedDB storage (default)
- [x] Legacy JSON storage fallback
- [x] CouchDB sync (live + manual)
- [x] Data migration (JSON → PouchDB)
- [x] 4-tab settings UI (spacious and native)
- [x] Reset progress (nuclear option)
- [x] Responsive/mobile design
- [x] Sync to Obsidian community plugin list

### Phase 2 — Differentiators (in progress)
- [x] FSRS weight optimizer (evolutionary strategy, pure TypeScript)
- [x] Swipe gesture review (left/right/up/down, pointer events)
- [x] Type-in-answer cards (active recall typing with ?type flag)
- [x] In-place image occlusion display (auto-detect, tap-to-flip/peek, responsive viewport containment)
- [x] Guided card creation modal (`CreateCardModal` with type dropdown and live preview)
- [x] Guided deck creation modal (`CreateDeckModal` with auto `#flashcards` tagging)
- [x] Official custom Lemma SVG brand icon registration via Obsidian API `addIcon` (native monochrome `currentColor`)
- [x] Organization migration to `Fundaments-Work/Lemma` & Buy Me a Momo sponsorship integration
- [x] Performance architecture:
  - Debounced vault event processing (350ms batching into `Set<TFile>`)
  - Zero-allocation tag cache checks (`hasTag` fast path)
  - File modification time caching (`fileMtimes`) skipping unchanged notes
  - Single-pass O(N) pre-computed heading breadcrumbs
- [x] Stats v2: retention curve (predicted vs actual), card maturity doughnut, 12-month activity heatmap, review interval histogram, and per-deck stacked breakdown
- [x] Licensing: copyright attribution corrected to Fundaments Work (2025-2026), `THIRD_PARTY_NOTICES.md` added for bundled dependencies, contribution terms documented, license row added to the settings About tab
- [x] Security hardening: CouchDB credentials kept out of replicated sync metadata, credential redaction in status output, insecure HTTP warning, production dependency audit in CI, and community review disclosures for vault, storage, and network access
- [x] Community review compliance: release assets limited to `main.js`, `manifest.json`, and `styles.css`; `package-lock.json` restored for source-review dependency installation; `obsidian` typings pinned to 1.8.7; `minAppVersion` raised to 1.7.2 to match the APIs already in use; scanner disclosures documented
- [ ] Per-deck settings overrides

### Phase 3 — Polish (planned)
- [ ] Declarative settings API (`getSettingDefinitions`) migration to replace the deprecated `display()` method on Obsidian 1.13+
- [ ] Data export/import (JSON backup/restore)
- [ ] i18n framework for community translations
- [ ] Plugin API for external card creation
- [ ] Enhanced sync (conflict resolution, status indicator)

## Known gaps & pain points

### Performance
- `updateCard()` writes to PouchDB one doc at a time — batch writes would reduce IndexedDB overhead
- `recalculateAllDeckStats()` iterates all cards — can be spread across idle cycles on massive vaults (50k+ cards)

### Type errors
- `@types/pouchdb` has incompatible type definitions, suppressed via `skipLibCheck`

### No WASM optimizer
- The FSRS optimizer is a pure-TypeScript evolutionary strategy, not the full fsrs-rs optimizer
- ~30 generations * 20 candidates = 600 evaluations, takes ~2-5s for typical review logs
- fsrs-browser (WASM) would be faster but adds Web Worker + SharedArrayBuffer complexity

## Near-term priorities

1. **Per-deck settings** — per-deck new/review limits & desired retention overrides
2. **PouchDB write batching** — batch review logs to reduce IndexedDB write cycles
3. **Data export/import** — JSON/Anki package backup and restore
4. **i18n** — extract UI strings for community translation

## Long-term possibilities

- Deck templates (custom card CSS per deck)
- Obsidian Sync native support (vs CouchDB)
- Shared deck marketplace via CouchDB
- Collaborative decks (real-time shared review)

---

*Last updated: 2026-10-20*
