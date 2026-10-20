# Migrating

Move existing Lemma review data from data.json into the local PouchDB database, and learn what Lemma can and cannot import from other spaced repetition tools. For backups and card imports see [Backup and import](backup-and-import.md).

## Older Lemma data in data.json

Early versions of Lemma kept card schedules and review history in the plugin's `data.json` file. Current versions store them in a local database by default. The setting **Use PouchDB (IndexedDB)** switches between the two.

To copy your old data into the database:

1. Make sure **Use PouchDB (IndexedDB)** is on under **Settings > Lemma > General**. If you just turned it on, reload Obsidian.
2. Wait for Lemma to finish loading so your decks are indexed. Click the refresh icon on the dashboard if unsure.
3. Click **Migrate now** next to **Migrate to PouchDB**.
4. Wait for the notice. Success reads "Migration successful! Migrated N cards and M reviews." If something is missing it reads "Migration completed with errors:" followed by what failed.

What the migration does:

- It copies settings, card schedules and review history from `data.json` into the database.
- It copies a card's schedule only if that card still exists in a tagged note right now. Schedules of cards that no longer exist are skipped and counted as orphans.
- It does not delete anything from `data.json`.
- You can run it again; it overwrites the copies in the database.

## Going back to data.json storage

Turn **Use PouchDB (IndexedDB)** off and reload Obsidian. Lemma then reads schedules and history from `data.json`. Data that exists only in the database is not copied back, and the sync commands are unavailable while the setting is off.

## Moving to a new device

Review data does not move with your notes. Either set up [CouchDB sync](sync-and-data.md) on both devices, or use a backup: run **Export review data (backup)** on the old device, copy the `Lemma backup ... .json` file to the new one, and run **Import review data from backup**. Import merges: a card keeps whichever version was reviewed most recently, and nothing is deleted. Cards are matched by their IDs, so the deck notes must have the same paths (or use block IDs and the same folder layout).

## From other spaced repetition tools

Run **Import cards from file** and choose a plain text export (in Anki, **Export > Notes in Plain Text**, with HTML included if you like) or a CSV or TSV file. Lemma reads the first column as the front and the second as the back, turns `{{c1::text}}` into a cloze, strips HTML, gives every card a block ID and creates a new deck note tagged `#flashcards`. Cards with line breaks use the `---card---` format. Imported cards start as new cards: scheduling data and media files are not imported, and further columns such as tags are ignored.

For other sources, convert the text yourself, since Lemma cards are plain Markdown:

1. Export or copy your cards as text.
2. Rewrite each card into one of Lemma's formats: `Question::Answer`, a `---card---` block, or a cloze with `==c1::text==`. See [Writing cards](writing-cards.md).
3. Put them in notes tagged `#flashcards`.
4. Add a block ID to each card, or use the commands that add one, so edits keep history.

If another plugin already uses `::` or `==` in your notes, its syntax may be read by Lemma as cards once the note is tagged `#flashcards`. Only tag notes you want Lemma to read.

## Renaming and moving decks

Card IDs include the deck note's path. When you rename or move a deck note inside Obsidian, Lemma moves each card's schedule and review history to the new IDs, so progress follows the note. A rename made outside Obsidian, or while it was closed, looks like a deleted note and a new one, and the cards start as new cards. See [Troubleshooting](troubleshooting.md#progress-looks-reset).
