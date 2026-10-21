# Lemma Compared With Other Obsidian Flashcard Plugins

A factual comparison of Lemma with other Obsidian flashcard plugins on scheduling algorithm, card syntax, review data storage, mobile, sync, licence and AI.

This page helps you choose between Obsidian flashcard plugins. The Lemma column comes from this guide and from Lemma's source code. The other columns come only from each plugin's own README, documentation or Obsidian community listing, as of October 2026. Plugins change, so check the linked source before you decide. "Not stated" means the source I read did not say, not that the feature is missing.

## Which plugins are compared?

- **Lemma** (this guide).
- **Spaced Repetition** by st3v3nmw, the plugin often called Obsidian Spaced Repetition.
- **FSRS** by Evgene-Kopylov.
- **FSRS Flashcards** (`sfc-flashcards`) by Helfas.
- **True Recall** by pieralukasz.
- **Come Through** by mntno.

Other plugins exist. These were chosen because their own pages describe flashcards with FSRS or are the best-known SM-2 style plugin. Links to every source are in [Sources](#sources).

## How do they compare?

| | Lemma | Spaced Repetition (st3v3nmw) | FSRS (Evgene-Kopylov) | FSRS Flashcards (Helfas) | True Recall | Come Through |
|---|---|---|---|---|---|---|
| Scheduling algorithm | FSRS-5 through the `ts-fsrs` library | FSRS or SM-2 | "FSRS-6" | "FSRS-5" | Described as spaced repetition "with 21 trainable parameters"; algorithm name not stated in the text read | FSRS |
| Card syntax | `::`, `:::`, `---card---` blocks, `==c1::text==` clozes, image and type-in cards, all plain Markdown in the note | `::`, `:::`, multi-line with a `?` or `??` line, clozes with `==highlight==`, `**bold**` or `{{braces}}` | An `fsrs-table` block; cards are created with a command that adds FSRS fields to the note header | Not stated in the listing; source passages keep a `^sfc-xxxx` marker | Not stated; "Create flashcards inside your notes" | A code block or frontmatter using `ct` |
| Where review data is stored | Local browser database (PouchDB on IndexedDB) by default; settings, streak and XP in `data.json` | In the note files: an HTML comment after each card, and frontmatter for notes | In each note's frontmatter, under `reviews` | Under `.obsidian/plugins/sfc-flashcards/` | A SQLite database in `.true-recall/` inside the vault | Not stated |
| Mobile | Yes (`isDesktopOnly` is `false`) | Not stated | Android listed as supported; iOS listed as not tested | "Full mobile support" | "Works on desktop and mobile" | Not stated |
| Sync approach | Optional CouchDB replication of schedules and history; notes sync by whatever you already use | Not stated | Not stated | Not stated | Account-backed cloud sync, or shared-vault sync through iCloud, Obsidian Sync or another file provider | The README warns that syncing can cause review statistics to be overwritten with older data |
| Licence | MIT | MIT | LGPLv3 | MIT | PolyForm Strict License 1.0.0, described as source-available and not open source | MIT (stated as a link, terms not shown in the text read) |
| AI features | None | Not stated | None described | Off by default; AI drafting needs a companion plugin | An AI workspace that makes flashcards from selected text | Not stated |
| Anki import | Plain-text and CSV/TSV card import; no scheduling data, no `.apkg` | Not stated | Not stated | Not stated | `.apkg` import, and export to Anki or CSV/TSV | Not stated |

Notes on the table:

- Lemma's review data stays in your note files only for the cards themselves. Schedules and history are in the database, which is why Lemma has a backup export. See [Sync and data](sync-and-data.md).
- The st3v3nmw documentation describes where its data goes; its README does not mention mobile or sync. Read its documentation for current detail.
- The Evgene-Kopylov README lists "FSRS-6" and requires Obsidian 1.12.7 or later. Lemma requires Obsidian 1.7.2 or later.

## What does Lemma do differently?

These points are verified against Lemma's guide and code.

- **Review data is not inside your notes.** Cards are plain Markdown, but schedules and review history live in a local database. Your notes stay clean, and review data does not travel with them. You need CouchDB sync or a backup file to move it between devices. See [Sync and data](sync-and-data.md) and [Backup and import](backup-and-import.md).
- **It needs a server you run for sync.** Lemma does not provide one. Sync does not merge conflicts: if you review a card on two devices before they sync, CouchDB picks one version.
- **It makes no network requests unless sync is on.** It has no telemetry.
- **Daily limits are global.** Max new cards and max reviews per day apply to all decks, with no per-deck overrides. See [Settings](settings.md).
- **It has its own FSRS weight optimizer**, which is not the reference FSRS optimizer. See [FSRS in Obsidian](fsrs-in-obsidian.md).
- **It has no AI features** and no `.apkg` importer.

## Which should I choose?

Choose by your constraints, not by this table alone.

- **You want SM-2 as well as FSRS.** Lemma schedules only with FSRS-5. Spaced Repetition by st3v3nmw lists both FSRS and SM-2.
- **You have Anki decks in `.apkg` form.** Lemma cannot import them; it reads plain-text and CSV/TSV exports and brings no scheduling data. True Recall's listing says it imports `.apkg` decks.
- **You want AI-drafted cards.** Lemma has none. True Recall's listing describes an AI workspace, and FSRS Flashcards describes optional AI drafting through a companion plugin.
- **You want review data kept inside each note.** Spaced Repetition (st3v3nmw) and FSRS (Evgene-Kopylov) describe storing it in the note itself, in a comment or frontmatter. Lemma does not.
- **You want sync that follows your vault with no server.** True Recall's listing says shared-vault sync works through iCloud, Obsidian Sync or any file provider. Lemma's review data needs CouchDB or manual backup files.
- **You need a permissive open source licence.** Lemma is MIT. Several others are MIT too; check the LGPLv3 and PolyForm terms of the others against your needs.
- **You want a plugin with tagged decks, many card formats, custom study, statistics and mobile review, with optional self-hosted sync.** This is what Lemma documents. See [Getting started](getting-started.md) and [Writing cards](writing-cards.md).
- **You already use another plugin's `::` or `==` syntax.** Lemma reads `::` lines in any note with the deck tag, so only tag notes you want Lemma to read. See [Migrating](migrating.md).

If a feature you need is not in the list above, check each plugin's own page. This comparison covers only the dimensions that could be sourced.

## Sources

Last checked: October 2026. Each line states what it supports.

- [st3v3nmw/obsidian-spaced-repetition README](https://github.com/st3v3nmw/obsidian-spaced-repetition), read 21 October 2026: FSRS or SM-2, card syntax list, MIT licence. Mobile, sync, AI: not stated.
- [Spaced Repetition documentation, data storage page](https://www.stephenmwangi.com/obsidian-spaced-repetition/data-storage/), read 21 October 2026: scheduling data stored in an HTML comment per card and in frontmatter for notes.
- [Evgene-Kopylov/fsrs_plugin README](https://github.com/Evgene-Kopylov/fsrs_plugin), read 21 October 2026: FSRS-6, `fsrs-table`, frontmatter `reviews` storage, Android and iOS status, LGPLv3, no network requests, no AI features described.
- [FSRS Flashcards listing on the Obsidian community site](https://community.obsidian.md/plugins/sfc-flashcards), read 21 October 2026: FSRS-5, storage folder, mobile support, MIT, AI off by default with a companion plugin. Its repository is linked from the listing at [mojunbeiming/obsidian-fsrs-flashcards](https://github.com/mojunbeiming/obsidian-fsrs-flashcards).
- [True Recall listing on the Obsidian community site](https://community.obsidian.md/plugins/true-recall), read 21 October 2026: 21 trainable parameters, SQLite in `.true-recall/`, mobile, sync options, PolyForm Strict licence, AI workspace, `.apkg` import. Repository: [pieralukasz/true-recall](https://github.com/pieralukasz/true-recall).
- [mntno/obsidian-come-through README](https://github.com/mntno/obsidian-come-through), read 21 October 2026: FSRS, `ct` syntax, sync conflict warning, MIT link. Storage, mobile, AI: not stated.
- Lemma facts: [Sync and data](sync-and-data.md), [Mobile](mobile.md), [Settings](settings.md), [Backup and import](backup-and-import.md), the plugin manifest and the MIT `LICENSE` in the [Lemma repository](https://github.com/Fundaments-Work/Lemma).
