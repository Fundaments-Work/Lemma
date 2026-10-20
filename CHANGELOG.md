# Changelog

All notable changes to this project will be documented in this file.

## [1.1.4] - 2026-10-20

### Security
- **CouchDB Credential Exposure:** Sync metadata no longer stores the authenticated URL (which included the CouchDB password) in the `sync_meta` document. That document replicates to the remote database, so the password was exposed to anyone with read access to it. Credentials now stay in memory, only the sanitized server URL is persisted, and legacy metadata is cleaned automatically on load and on the next sync.
- **Credential Redaction:** The "Check sync status" command and sync debug logging now strip usernames and passwords from the displayed URL.
- **Plaintext Password Disclosure:** The sync settings no longer claim the CouchDB password is "stored securely". The password is saved in the plugin data file; the README now states this explicitly and recommends a dedicated database user limited to the sync database.
- **Insecure Transport Warning:** Enabling or testing sync over a non-loopback `http://` URL now warns that credentials and review data are sent unencrypted.
- **Production Dependency Audit:** The release workflow now runs `pnpm audit --prod` and installs with `--frozen-lockfile`.

### Changed
- **Relicensed to MIT:** Lemma moves from the ISC License to the **MIT License** from v1.1.4 onward, aligning with Theorem and with the licence already stated across the Fundaments.work site. Both licences are permissive and materially equivalent, so no existing user loses any right: anything distributed as ISC through v1.1.3 remains ISC, and MIT additionally grants an express patent licence. Copyright holder is Fundaments Work (2025-2026).
- **Dependency Refresh:** Updated the development toolchain (`esbuild` 0.28.2, `@types/node` 22, `vitest` 4.1.12), reducing reported advisories from 51 to one dev-only advisory in the `obsidian` type definitions. Runtime dependency versions are unchanged.
- **Dependency Cleanup:** Removed the unused `fsrs-browser` runtime dependency and moved `@types/pouchdb` to `devDependencies`.
- **Markdown-Only Vault Events:** Create, modify, delete, and rename handlers now ignore non-Markdown files, matching the documented vault access scope.

### Fixed
- **Licensing Attribution:** Corrected the copyright holder in `LICENSE` from the legacy personal handle to **Fundaments Work** (2025-2026), fixing a mismatch with `manifest.json`, `package.json`, and the GitHub organization that had been introduced by the 1.1.3 organization migration.
- **README Title:** Added a Markdown H1 so the README title matches the manifest name.

### Added
- **Third-Party Notices:** Added [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) documenting the licenses of dependencies bundled into `main.js`, including the Apache-2.0 attribution requirements for `pouchdb-browser`. Ships alongside `LICENSE` in release artifacts.
- **License Terms in Contributing Guide:** Documented inbound contribution licensing under [`CONTRIBUTING.md`](CONTRIBUTING.md) (MIT, no separate CLA).
- **License Row in Settings:** Added a license setting with a link to the license text to the About tab.

### Documentation
- **Privacy and Network Access:** Documented vault access, local storage, the optional CouchDB connection, and the two external links opened from the settings tab in the README.
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
