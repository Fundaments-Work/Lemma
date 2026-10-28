# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1] - 2026-10-28

This release adds explicit card ending delimiters, sibling card burying, per-deck frontmatter settings overrides, leech detection, atomic review log batching, automatic streak and XP recovery from review logs, cloze hint support, and fixes review window button layout, comment-based breadcrumbs, and multi-cloze card formatting.

### Added
- **Explicit card delimiter (`---end---` / `---card-end---`):** Multi-line basic cards can explicitly define where the card back ends, preventing headings, subheadings, and notes below the card from being captured into the back. Fully backwards-compatible if omitted.
- **Sibling card burying:** Automatically defers sibling cards (such as other cloze deletions from the same note or cards sharing a block ID prefix) until the next day to prevent recall cues during study. Can be toggled in settings.
- **Per-deck settings overrides:** Notes can override daily review limits and scheduling retention via YAML frontmatter (`newCardsPerDay`, `reviewsPerDay`, `requestRetention`).
- **Leech detection:** Automatically detects and displays an unobtrusive warning badge on cards that have lapsed repeatedly, prompting learners to simplify or rewrite them.
- **Atomic review log batching:** Card state updates and review logs are written together in a single bulk PouchDB transaction, eliminating race conditions and cutting IndexedDB write overhead in half.
- **Cloze hints:** Added support for cloze hints using `==cN::answer::hint==` syntax, displaying `[hint]` on the front of the card.
- **Automatic streak and XP recovery:** Automatically reconciles streak and XP counters on startup from durable review history logs in PouchDB, preventing progress loss if local settings are reset or desynchronized.

### Fixed
- **Streak and XP loss on reload:** Fixed an issue where review stats and XP were kept only in memory during PouchDB sessions; ratings now immediately persist gamification state to disk, and streaks calculate using local calendar dates rather than UTC timestamps.
- **Multi-cloze card display:** Inactive cloze markers on multi-cloze cards now render as plain text on the front side instead of exposing raw `==cN::` syntax or highlighted markers.
- **Breadcrumb code comments:** Code block comments (such as `#` in Python snippets) and frontmatter comments are no longer falsely recognized as Markdown headings.
- **Review window header button layout:** Removed the redundant close button and aligned the undo, edit, and native modal close buttons cleanly without overlapping.
- **Cloze boundary leakage:** Fixed an issue where cloze deletions following immediately after `---end---` without an empty blank line erroneously inherited the preceding basic card content and delimiter.

### Changed
- **Settings tab clarity:** Reorganized the settings tab into intuitive, task-focused sections with clear descriptions and frontmatter override examples.

## [1.2.0] - 2026-10-20

This release fixes several problems that made progress look lost, and adds undo, backup and card import. It was tested against data written by 1.1.5, including a copy of a real Obsidian database, and no existing data is moved, renamed or deleted.

### Compatibility
- **Your earlier progress comes back.** Versions up to 1.1.5 saved schedules and review history to the local database but could not read them back after a restart, so cards looked new and statistics looked empty. 1.2.0 loads everything that was saved. Cards you had rated show their schedules again, and the statistics show your full history.
- **Existing installs keep the database name `lemma_local`.** Obsidian gives all vaults one shared browser storage, so a vault installed fresh now gets its own database, `lemma_local_` plus a vault identifier, stored in `data.json` before the first save. Nothing is migrated or renamed for existing installs.

### Added
- **Undo last rating:** The review window has an undo icon and a `Z` key. Undo restores the card's previous schedule, removes the rating from history and statistics, and restores streak and XP counters, in both storage modes. It can be repeated back to the start of the window.
- **Learning cards return in the same session:** A card rated Again, or a new card rated Hard or Good, comes back a few cards later when its short step is due within 30 minutes.
- **Backup and restore:** **Export review data (backup)** writes schedules, review history and streak data to a JSON file in the vault. **Import review data from backup** merges a backup, or a `data.json` file from any version, keeping the more recently reviewed version of each card and never duplicating reviews.
- **Import cards from file:** Converts a plain text export from another flashcard app, or a CSV, TSV or semicolon separated file, into a deck note. It handles quoted multi-line fields, cloze notes, HTML, block IDs and text containing `::`.
- **User guide page:** [Backup and import](docs/user/backup-and-import.md).

### Fixed
- **Schedules not loading after a restart:** `getAllCardStates()` read only document IDs starting with `fsrs-`, but card IDs are `deckId::blockId` or a bare hash. The query now reads every document outside the review-log range and filters by document type, so current and legacy IDs both load.
- **Review history not loading after a restart:** `getReviewHistory()` passed its keys in the wrong order for a descending query and returned nothing. History feeds statistics, the activity chart and the daily limits.
- **Renaming or moving a deck note:** Inside Obsidian, each card's schedule and history now move to the card's new ID, in memory and in the database. Previously every card restarted as new. A rename made outside Obsidian is still seen as a delete and a create.
- **Whole-note review rename:** Renaming a `#review` note keeps its schedule and no longer leaves a stale entry for the old path in the due list.
- **Schedules lost on note edit:** Editing a deck note no longer drops the in-memory schedules of its cards (in JSON storage mode the loss was then saved to `data.json`).
- **7-day forecast and Due this week:** Cards are counted on the day they are due for the next seven days, with overdue cards in today's bar. The old calculation discarded nearly every card, so both read zero.
- **Review window card info:** The title notice and the "Edit this card" pencil follow the card on screen instead of always showing the first card.
- **Daily new-card limit:** The limit now subtracts the cards in the deck whose first rating was today, so later sessions the same day no longer offer a fresh batch.
- **Same-day learning cards:** Cards rated today are no longer excluded from deck queues, so a card in a short step is offered again once it is due.
- **Duplicate data in data.json:** With PouchDB storage on, changing a setting no longer writes schedules and review history into `data.json`.
- **Review shortcuts did nothing:** The review, note review and browse windows registered the literal key name `keydown`, which matches no key. Space, Enter, `1` to `4` and the arrow keys now work, and keys are ignored while typing in an answer box. Found by testing in Obsidian 1.14.
- **Edit pencil missing:** Obsidian 1.14 has no `.modal-header-controls` element, so the pencil never appeared. Header buttons now render with or without it.
- **Short cards rendered as a thin column:** The review card now takes the full width, up to 600 px.

### Performance
- Indexing a note with thousands of cards is about 7 times faster (6,000 cards: 2.2 s to 0.3 s).
- Building study queues no longer rescans the whole review history per deck, and **Study all due** no longer de-duplicates with a quadratic search (200,000 logged reviews: 493 ms to 35 ms).
- Rating a card no longer rescans the whole review history (about 50 times faster with 200,000 logged reviews).

### Changed
- When a study queue is empty because the daily limits are used up, the notice says so and points to cram.
- The new-card setting description reads "Applies to each deck separately", matching the behavior and the README.
- Obsidian plugin guideline compliance: appending a card to a closed note uses `Vault.process`, user-supplied paths go through `normalizePath`, the card font size uses a CSS variable instead of an inline style, promise chains are written with async/await, and the console shows only errors by default.
- Documentation: new Backup and import page, updated guides for reviewing, scheduling, migrating, sync and data, troubleshooting, commands and the README privacy section; corrected `:::` in the flashcard guide (one reversed card, not two), FSRS-5 with ts-fsrs 4.7.1 in the status and design pages, and the stale examples in `data.example.json`.
- The release workflow no longer runs `scripts/check-content.mjs`, which was removed earlier and would have failed the release.
- Development: tests pass on Node 20 and 22 and run against a real PouchDB on `fake-indexeddb`, a `jsdom` review window, and a verbatim copy of the 1.1.5 database writer (`fake-indexeddb` and `jsdom` are dev dependencies). CONTRIBUTING explains how to test in a disposable Obsidian profile.

## [1.1.5] - 2026-10-20

### Fixed
- **Community Review Release:** Republished the 1.1.4 review-compliance work as 1.1.5 with npm as the only package manager. The `b37174b` source passed the community preview scan, but the directory only creates a new release scan for an incremented version. No plugin behavior changed from 1.1.4.

## [1.1.4] - 2026-10-20

### Security
- **CouchDB Credential Exposure:** Sync metadata no longer stores the authenticated URL (which included the CouchDB password) in the `sync_meta` document. That document replicates to the remote database, so the password was exposed to anyone with read access to it. Credentials now stay in memory, only the sanitized server URL is persisted, and legacy metadata is cleaned automatically on load and on the next sync.
- **Credential Redaction:** The "Check sync status" command and sync debug logging now strip usernames and passwords from the displayed URL.
- **Plaintext Password Disclosure:** The sync settings no longer claim the CouchDB password is "stored securely". The password is saved in the plugin data file; the README now states this explicitly and recommends a dedicated database user limited to the sync database.
- **Insecure Transport Warning:** Enabling or testing sync over a non-loopback `http://` URL now warns that credentials and review data are sent unencrypted.
- **Production Dependency Audit:** The release workflow now runs `npm audit --omit=dev` and installs with `npm ci`.

### Changed
- **Relicensed to MIT:** Lemma moves from the ISC License to the **MIT License** from v1.1.4 onward, aligning with Theorem and with the licence already stated across the Fundaments.work site. Both licences are permissive and materially equivalent, so no existing user loses any right: anything distributed as ISC through v1.1.3 remains ISC, and MIT additionally grants an express patent licence. Copyright holder is Fundaments Work (2025-2026).
- **Dependency Refresh:** Updated the development toolchain (`esbuild` 0.28.2, `@types/node` 22, `vitest` 4.1.12), reducing reported advisories from 51 to one dev-only advisory in the `obsidian` type definitions. Runtime dependency versions are unchanged.
- **Dependency Cleanup:** Removed the unused `fsrs-browser` runtime dependency and moved `@types/pouchdb` to `devDependencies`.
- **Markdown-Only Vault Events:** Create, modify, delete, and rename handlers now ignore non-Markdown files, matching the documented vault access scope.

### Fixed
- **Licensing Attribution:** Corrected the copyright holder in `LICENSE` from the legacy personal handle to **Fundaments Work** (2025-2026), fixing a mismatch with `manifest.json`, `package.json`, and the GitHub organization that had been introduced by the 1.1.3 organization migration.
- **README Title:** Added a Markdown H1 so the README title matches the manifest name.
- **Release Assets:** GitHub releases now attach only the files Obsidian supports: `main.js`, `manifest.json`, and `styles.css`. `LICENSE` and `THIRD_PARTY_NOTICES.md` remain in the repository and in the tagged source.
- **Source Review Dependencies:** Restored `package-lock.json`, regenerated from the current `package.json`, so the community review scanner can install dependencies and complete build verification. Every `resolved` URL points at `registry.npmjs.org`, and a tracked `.npmrc` pins the public registry so the network-restricted review sandbox can reach every package. npm is the source of truth for local development, CI, and release builds.
- **Single Package Manager:** Removed `pnpm-lock.yaml` and standardized on npm. The community scanner checks `pnpm-lock.yaml` before `package-lock.json`; when pnpm is not available on its runner it falls back to `npm install` instead of the frozen `npm ci`, which caused the source-review dependency installation failure. With only `package-lock.json` committed, the scanner installs the locked tree with `npm ci` and its build matches the release workflow.
- **Scanner Type Check:** Added `skipLibCheck` to `tsconfig.json` so the scanner's standalone `npx tsc --noEmit` matches the build script instead of failing on third-party type declarations.
- **Minimum Obsidian Version:** Raised `minAppVersion` from `1.4.0` to `1.7.2` to match APIs the plugin already uses (the `revealLeaf` calls that open the dashboard require 1.7.2). The plugin declared support for versions where opening the dashboard could fail.
- **Reproducible Typings:** Pinned `obsidian` to `1.8.7` instead of a caret range. The caret resolved to 1.14.4 under npm, whose declarative-settings typings do not match this release's settings implementation and broke the source-review build.
- **Reproducible Release Build:** The release workflow now installs with `npm ci` and builds with npm, matching the community scanner's dependency layout. The earlier pnpm-based layout produced a different `main.js`, which would fail the scanner's byte-for-byte build verification.

### Added
- **Third-Party Notices:** Added [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) documenting the licenses of dependencies bundled into `main.js`, including the Apache-2.0 attribution requirements for `pouchdb-browser`. Lives in the repository alongside `LICENSE`; release assets are limited to the files Obsidian supports.
- **License Terms in Contributing Guide:** Documented inbound contribution licensing under [`CONTRIBUTING.md`](CONTRIBUTING.md) (MIT, no separate CLA).
- **License Row in Settings:** Added a license setting with a link to the license text to the About tab.

### Documentation
- **Privacy and Network Access:** Documented vault access, local storage, the optional CouchDB connection, and the two external links opened from the settings tab in the README.
- **Scanner Disclosures:** Documented the Vault Enumeration and Local Storage disclosures in the README: indexing Markdown notes requires enumerating their paths, and PouchDB's `localStorage` use is limited to a capability probe and a cross-tab change marker. Neither stores vault content or review data.
- **Completed Design Plans:** Moved the in-place image occlusion plan to [`docs/plans/done/`](docs/plans/done/) with `Status: Done`, repointed the stale legacy-org issue link to the `Fundaments-Work` org, and revised the plan to describe the shipped implementation (the `isInPlaceImageCard` helper, type-in exclusion, `Space`/`P`/`F` peek shortcuts, and the final CSS and test coverage).
- **Stale Documentation Corrections:** [`DESIGN.md`](DESIGN.md) listed 8 of the 15 registered commands and omitted the `editor-menu` event, and [`PROJECT_STATUS.md`](PROJECT_STATUS.md) still tracked Stats v2 as incomplete and led its priority list with it, despite the retention curve, maturity doughnut, 12-month heatmap, interval histogram, and per-deck breakdown all shipping in [`StatsModal`](src/ui/StatsModal.ts). Corrected the command and event tables, documented the 350ms file-batching versus 500ms dashboard debounce windows, and added the shipped type-in and in-place occlusion behaviour to the `ReviewModal` section.

## [1.1.3] - 2026-10-12

### Added
- **In-Place Image Occlusion Viewer:** Diagram cards where both front and back are images (e.g. Excalidraw, anatomy masks) automatically render in the exact same viewport position with interactive tap/peek toggling (`Space` / `P` / `F`), eliminating vertical displacement and mobile scrolling (closes #1).
- **Type-In Active Recall Cards:** Support for active recall testing via `?type` flag in single-line (`Q::A ?type`) and block format (`---card--- ?type`), featuring real-time diff feedback and full FSRS rating buttons.
- **Guided Creation Modals:** Added `CreateCardModal` (dropdown selector for card types with live syntax preview) and `CreateDeckModal` (interactive deck creator with automated `#flashcards` tagging).
- **High-Performance Vault Indexing:**
  - Debounced vault modify/create events (350ms batching into `Set<TFile>`) to eliminate keystroke lag while typing notes.
  - Zero-allocation tag cache checks (`hasTag`) eliminating thousands of intermediate array allocations.
  - File modification time caching (`fileMtimes`) skipping unchanged files and avoiding unnecessary disk I/O.
  - Single-pass $O(N)$ pre-computed heading breadcrumbs replacing repetitive $O(N^2)$ string splitting during card parsing.
- **Standard Native Obsidian Vector Icon:** Replaced custom scaled raster-like shapes with a standard Lucide-compatible 100×100 vector icon (8px stroke, clean stacked flashcards with centered "L" monogram) that seamlessly inherits Obsidian theme colors across ribbon, status bar, and dashboard without blur.
- **Polished Settings UI:** Redesigned About tab with clean spacing, interactive user guide button, and quick reference cheatsheets.
- **Organization & Sponsorship Migration:** Migrated repository links to `Fundaments-Work/Lemma` and integrated Buy Me a Momo sponsorship.

## [1.1.2] - 2026-08-30

### Added
- **Declarative Settings Search:** Implemented `getSettingDefinitions()` on [`FSRSSettingsTab`](file:///run/media/sapiens/Development/Lemma/src/ui/FSRSSettingsTab.ts) to support Obsidian 1.13+ settings search and satisfy community review standards.

## [1.1.1] - 2026-08-29

### Added
- **Contributing Guide:** Added comprehensive [`CONTRIBUTING.md`](file:///run/media/sapiens/Development/Lemma/CONTRIBUTING.md) for open-source community guidelines.
- **Note Review Preview:** Added live Markdown rendering in [`ReviewNoteModal`](file:///run/media/sapiens/Development/Lemma/src/ui/ReviewNoteModal.ts) so notes tagged with `#review` display full formatted note content during review.
- **Enhanced Type-In Answers:** Type-in cards now display detailed feedback and reveal full rating controls (Again, Hard, Good, Easy) for complete review agency.

### Fixed
- **Scorecard & Linter Compliance:** Fully resolved all ESLint directives and Obsidian plugin scanner rules (`prefer-create-el`, `prefer-window-timers`, `no-explicit-any`, type assertions).
- **FSRS Weight Validation:** Updated [`FSRSSettingsTab`](file:///run/media/sapiens/Development/Lemma/src/ui/FSRSSettingsTab.ts) to support the full 19-weight FSRS 4.5/5.0 parameter array, ensuring seamless integration with the built-in weight optimizer.
- **Mobile Swipe Handling:** Refined gesture detection in [`ReviewModal`](file:///run/media/sapiens/Development/Lemma/src/ui/ReviewModal.ts) to prevent conflict between vertical card scrolling and rating swipes.
- **Community Scorecard Compliance:** Updated [`manifest.json`](file:///run/media/sapiens/Development/Lemma/manifest.json) description to strictly adhere to Obsidian community guidelines (omitting restricted terms and ensuring punctuation compliance).
- **Clean Documentation:** Removed all emoji glyphs across all documentation and guides for clean, professional presentation.

## [1.0.1] - 2026-07-05

### Fixed
- **Mobile Compatibility:** Fully resolved initialization crashes on Obsidian Mobile by migrating from the Web Crypto API to a synchronous `cyrb53` hash function.
- **Dependency Issues:** Bundled browser polyfills for Node internals (like `events`) required by PouchDB, preventing fatal `Module Not Found` errors on Capacitor/Cordova WebViews.
- **Mobile Ribbon Icon:** Added a new icon to the mobile ribbon menu, making it easy to open the Lemma dashboard with a single tap.
- **Dashboard Layout:** The dashboard now dynamically forces itself into the main workspace tab instead of getting cramped in a hidden sidebar layout.
- **Immersive Review UI:** Redesigned the mobile flashcard review modal. Removed bulky card styling so content seamlessly fills the screen edge-to-edge.
- **Safe Area Insets:** Fixed bugs where the mobile device notch and bottom swipe bars overlapped the review modal. The header and close button now perfectly respect device safe areas (`--safe-area-inset-top`).
- **Compact Badges:** Replaced long wrapping modal titles with a beautiful, space-saving pill badge (e.g., `1/20`) for the review counter on narrow screens.
- **Security Check:** Removed the outdated `crypto-js` dependency, entirely clearing plugin security scan warnings.

## [1.0.0] - Initial Release

- Initial stable release featuring FSRS scheduling algorithm.
- Added support for basic and cloze cards.
- Integrated dashboard view with due counts and statistics.
- Added CouchDB sync capabilities.
