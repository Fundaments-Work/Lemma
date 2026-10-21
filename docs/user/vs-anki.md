# Lemma vs Anki

A factual comparison of Lemma, the Obsidian flashcard plugin, with Anki on scheduling, card storage, sync, mobile, add-ons, licence and moving from Anki.

Anki is the long-established spaced repetition program, with its own desktop app, mobile apps, sync service and add-on ecosystem. Lemma is a plugin that runs inside Obsidian and reads flashcards from your notes. They solve the same problem in different places, so the better choice depends on where you already work. This page compares them on points that can be sourced. The Anki column comes from Anki's own manual and website, as of October 2026. The Lemma column comes from this guide and Lemma's source code. Anki changes between releases, so check the linked pages before you decide. "Not stated" means the page I read did not say.

For a comparison with other Obsidian plugins, see [Compared with other plugins](compared-with-other-plugins.md).

## How do Lemma and Anki differ at a glance?

| | Lemma | Anki |
|---|---|---|
| What it is | A plugin inside Obsidian | A standalone program for Windows, macOS and Linux, with companion mobile apps and a web service |
| Where cards live | Plain Markdown in your notes. A note with the deck tag is a deck | In Anki's own collection, as notes of a note type. A note can produce several cards |
| Scheduling | FSRS-5, through the `ts-fsrs` library | FSRS, which you turn on in deck options, as an alternative to the older SM-2 algorithm |
| Where review history lives | A local browser database (IndexedDB), replicated to your own CouchDB if you enable sync | In the Anki collection, synced through AnkiWeb or a sync server |
| Sync | Optional CouchDB replication of schedules and history. You run the server. Notes sync however you sync your vault | AnkiWeb, a free service according to the manual, or a self-hosted sync server |
| Mobile | Obsidian mobile, same plugin | AnkiMobile for iOS and AnkiDroid for Android |
| Extending it | No add-on system of its own | Add-ons, installed from Tools > Add-ons or the AnkiWeb add-on listing |
| Licence | MIT | AGPL v3 or later for the main code |
| Card creation | Typing syntax in a note, or commands and a guided creator | A note editor with fields, note types and card templates |

## How does scheduling compare?

Both offer FSRS (in Anki you switch it on), a scheduler that predicts when you will forget a card and schedules the next review around a target retention. Anki's manual describes FSRS as an alternative to its older SuperMemo 2 (SM-2) algorithm, switched on in the FSRS section of the deck options. It can only be enabled globally, not for some presets and not others. Anki's manual lists a parameter optimizer that learns from your review history. It names FSRS-5 once, in its note on letting FSRS control short-term scheduling; the page I read does not say which FSRS version current Anki uses and gives no version history.

Lemma uses FSRS-5 only. It has no SM-2 mode. It has its own weight optimizer, which is not the reference optimizer, and global daily limits for new cards and reviews. See [FSRS in Obsidian](fsrs-in-obsidian.md) and [How scheduling works](how-scheduling-works.md).

Anki's manual documents an FSRS parameter optimizer, a workload simulator and option presets that you assign to decks. If you rely on those, Anki is the better fit. Lemma applies the same daily limits to every deck. See [Settings](settings.md).

## How do cards and note types compare?

In Anki, a note has fields and a note type. The note type's card types generate one or more cards, and editing a note updates all of its cards. Decks group cards, can nest using `::`, and take their options from a preset you assign. Anki's built-in types include Basic, reversed variants, type-in-the-answer, Cloze and Image Occlusion, and you can make your own.

In Lemma, the text in your note is the card. Lemma supports a `---card---` block, a one-line `Question::Answer`, a reversed `:::` line, `==c1::text==` clozes, a type-in flag and image-pair cards. There are no custom note types or templates. A deck is simply a tagged note. See [Writing cards](writing-cards.md) and [Organizing decks](organizing-decks.md).

Anki's model is more flexible when one set of facts should produce many differently shaped cards. Lemma's model is lighter when your knowledge is already in notes and you want cards next to the context.

## How do media, math and cloze compare?

Anki's editor attaches images, audio and video, and can record from a microphone. Anki's manual recommends MathJax for math, which needs no extra software; LaTeX needs a separate TeX installation, and only the desktop version can generate its images. Cloze is a built-in note type, written `{{c1::...}}`.

Lemma renders card sides with Obsidian's own Markdown renderer, so Markdown, links, images, embeds, `$...$` math, code, tables and callouts work as they do in your notes. Cloze uses `==c1::text==`. Lemma does not draw image-occlusion masks for you; you prepare the two images. Lemma has no audio recorder of its own.

## How does sync compare?

AnkiWeb keeps a collection in step across devices. The manual calls it a free service and says reviews and edits from several devices are merged, with the card keeping the state from the most recent answer. It also says data on inactive accounts may be deleted. Anki also ships a self-hosted sync server that the manual calls an advanced option, and says it uses an unencrypted HTTP connection, so it should not be exposed directly to the internet.

Lemma has no hosted service. Sync is optional, off by default, and uses CouchDB replication to a server you run or rent. Lemma does not merge conflicting reviews: if you review a card on two devices before they sync, CouchDB picks one version. Without sync, review data stays on each device, and you can move it with a backup file. See [Sync and data](sync-and-data.md) and [Backup and import](backup-and-import.md).

If you want sync that works without running anything, Anki with AnkiWeb is simpler.

## How do mobile apps compare?

Anki's mobile apps are separate programs. AnkiMobile for iOS is the official app, and Anki's website says purchases help fund development, which indicates a paid app. AnkiDroid for Android is free and developed by contributors, with donations funding it. I did not record prices.

Lemma has no separate app. It runs in Obsidian mobile as the same plugin, with swipe ratings and a full-screen review window. See [Mobile](mobile.md). Review data is per device, so a phone and a computer need CouchDB sync to stay in step.

## What about add-ons and licences?

Anki has an add-on ecosystem. The manual describes installing add-ons from inside Anki and notes that they can modify arbitrary parts of Anki, so an Anki update may break older ones. Lemma has no add-on system, but it lives in Obsidian, which has its own community plugins.

Anki's main code is under the AGPL v3 or later, according to the licence file in its repository. Lemma is MIT licensed.

## Who should choose which?

Choose Anki if:

- You want Anki's add-ons and shared decks, or custom note types and card templates.
- You study from existing Anki decks, including scheduling data.
- You want a free hosted sync service and dedicated mobile apps with no server to run.
- You want per-deck options and detailed scheduler tooling.

Choose Lemma if:

- Your notes are already in Obsidian and you want flashcards in the same files, next to their context.
- You prefer plain Markdown cards that you can edit with any text tool, and a vault that stays readable on its own.
- You want review on phone and desktop using Obsidian, with optional sync to a CouchDB server you control.
- FSRS-5 is enough and you do not need SM-2.

Be aware of Lemma's limits: no `.apkg` import, no add-on system, global daily limits, and review data that is not stored in your notes.

## What does moving from Anki to Lemma involve?

Lemma has no `.apkg` importer and brings no scheduling data from Anki. What it does read is a text export:

1. In Anki, export your deck as **Notes in Plain Text** (the manual lists this under File > Export).
2. In Obsidian, run **Import cards from file** and choose the file. A CSV, TSV or semicolon file also works.
3. Lemma reads the first column as the front and the second as the back, turns `{{c1::text}}` into `==c1::text==`, strips HTML and creates a new deck note with a block ID on every card.

Imported cards start as new cards. Review history, media files and further columns such as tags are not imported. Treat the move as a fresh start for scheduling. If a card has line breaks or contains `::`, Lemma writes it as a `---card---` block. Full details are in [Migrating](migrating.md#from-other-spaced-repetition-tools) and [Backup and import](backup-and-import.md#import-cards-from-another-app).

## Can I use both?

Yes. They do not share data, so nothing conflicts. A common split is to keep existing Anki decks in Anki and put new, note-based material in Lemma. Because a Lemma card is plain text, you can also copy cards between the two with Anki's plain-text export and Lemma's import, one direction at a time. Anki can import plain text files, but I did not verify field mapping for cards written by Lemma, so test with a few cards first. Each app keeps its own schedule for any card you place in both, so do not review the same card in both.

To start from scratch in Lemma, see [Getting started](getting-started.md) and [How to make flashcards in Obsidian](flashcards-in-obsidian.md).

## Sources

- [Anki manual: deck options (FSRS)](https://docs.ankiweb.net/deck-options.html): FSRS as an alternative to SM-2, enabled globally in deck options, presets, optimizer, simulator, FSRS-5 mentioned once in the short-term scheduling note.
- [Anki manual: getting started](https://docs.ankiweb.net/getting-started.html): notes, note types, built-in types, decks and nesting, the app family.
- [Anki manual: editing](https://docs.ankiweb.net/editing.html): media attachment, recording, cloze and Image Occlusion.
- [Anki manual: math](https://docs.ankiweb.net/math.html): MathJax versus LaTeX requirements.
- [Anki manual: syncing](https://docs.ankiweb.net/syncing.html): AnkiWeb as a free service, merging, inactive account deletion.
- [Anki manual: sync server](https://docs.ankiweb.net/sync-server.html): self-hosted server, advanced option, unencrypted HTTP caveat.
- [Anki manual: add-ons](https://docs.ankiweb.net/addons.html): installing add-ons and the compatibility warning.
- [Anki manual: exporting](https://docs.ankiweb.net/exporting.html): Notes in Plain Text, .apkg and .colpkg exports.
- [Anki manual: packaged decks](https://docs.ankiweb.net/importing/packaged-decks.html): .apkg can carry scheduling information.
- [Anki downloads page](https://apps.ankiweb.net/): AnkiMobile paid and AnkiDroid free cost model, desktop platforms.
- [Anki source repository licence file](https://github.com/ankitects/anki/blob/main/LICENSE): AGPL v3 or later.

Lemma facts come from this guide, the plugin manifest, and the MIT `LICENSE` in the [Lemma repository](https://github.com/Fundaments-Work/Lemma).

Last checked: October 2026.
