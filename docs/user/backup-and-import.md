# Backup and Import

Save your review progress to a file, restore or merge it on any device, and turn card exports from other flashcard apps into Lemma decks.

Your cards live in your notes, so an ordinary vault backup already protects them. Your review progress (schedules, review history, streak and XP totals) lives in Lemma's local database, so it needs its own backup. Lemma can write that progress to a plain JSON file and merge it back later.

## Back up your review progress

1. Open the command palette and run **Export review data (backup)**.
2. Lemma creates one file in the vault root named `Lemma backup <date and time>.json` and shows its path.

The file holds every card schedule, the full review history and your streak and XP totals. It does not contain your settings, your CouchDB address or any password. Because it sits inside the vault, a vault backup or vault sync service carries it along. Move it out of the vault if you do not want it synced.

Run the command again at any time. Each run creates a new file; Lemma never overwrites or deletes an older backup.

## Restore or merge a backup

1. Run **Import review data from backup**.
2. Choose a file. Lemma shows how many card schedules and reviews it found, and how many entries it will skip because they are damaged.
3. Select **Import**.

The import is a merge, never a replacement:

- A card keeps whichever version was reviewed most recently. If your current data is newer, it stays.
- Reviews already in your history are not added twice, so importing the same file again changes nothing.
- Nothing is deleted.
- Streak and XP totals are replaced only when the backup has a higher total of reviewed cards.

Schedules are matched to cards by card ID, and card IDs include the deck note's path, so the notes need to be at the same paths as when the backup was made. When a backup contains schedules for notes that are not in this vault, Lemma stores them anyway and applies them if a card with the same ID appears later. The confirmation message tells you how many schedules matched cards in this vault.

### Moving to a new device

1. Run **Export review data (backup)** on the old device.
2. Copy the backup file to the new device, together with your notes, keeping the same folder layout.
3. Run **Import review data from backup** on the new device.

If you use [CouchDB sync](sync-and-data.md) you do not need to do this; sync keeps both devices up to date.

### Files from older versions

The import also accepts the `data.json` file from any released version of Lemma. It reads the card schedules and review history in it and ignores its settings. This is a way to recover progress from a copy of an old plugin folder. Schedules written by early versions use card IDs that no longer match current cards and are stored without being applied.

## Undo a rating

In the review window, press `Z` or select the undo icon beside the close button to take back the last rating. Undo restores the card's earlier schedule, removes the rating from your history and statistics, and restores your streak and XP counters. You can undo several ratings in a row, back to the start of the window. See [Reviewing](reviewing.md#keyboard-keys).

## Import cards from another app

Run **Import cards from file** to turn an export into a new deck note.

Supported files:

- A plain text export from another flashcard app, such as Anki's **Notes in Plain Text** export. Lines starting with `#` (the separator and HTML header lines) are read as settings and skipped.
- A CSV, TSV or semicolon separated file. Fields may be quoted, contain the separator, contain doubled quotes, and span several lines.

How rows become cards:

| In the file | In Lemma |
|---|---|
| First column | Front of the card |
| Second column | Back of the card |
| Further columns, such as tags | Ignored |
| `{{c1::text}}` or `{{c1::text::hint}}` in the first column | Cloze `==c1::text==`; the hint is dropped |
| HTML such as `<br>`, `<b>` and `&nbsp;` | Converted to plain text and line breaks |
| A field with line breaks, or text containing `::` | A `---card---` block, with `::` split by a zero-width space so it is not read as a second card |
| Rows with an empty front or back | Skipped and counted |

Every card receives a new block ID, so you can edit the text later without losing its history. The deck note is created in the vault root with the deck tag, using the name you type (or `Imported cards`). If that name exists, Lemma adds a number instead of overwriting it.

What is not imported: scheduling data and review history from the other app, media files and further columns. Imported cards start as new cards.

## What each file is and where it goes

| File | Created by | Contains |
|---|---|---|
| `Lemma backup <date and time>.json` | **Export review data (backup)** | Schedules, review history, streak and XP |
| A deck note named by you | **Import cards from file** | Cards in Lemma's Markdown formats |

Lemma reads only the single file you choose in the file picker, and it makes no network request for any of these features.
