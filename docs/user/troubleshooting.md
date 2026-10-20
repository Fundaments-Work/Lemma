# Troubleshooting

Fix Lemma cards that do not appear, progress that looks reset, review queue surprises and sync errors, and read the known limitations.

## Cards or decks do not appear

Work through these checks in order.

1. Confirm the note has the deck tag, `flashcards` by default, in its frontmatter or body. Check **Settings > Lemma > General > Deck tag** if you changed it. See [Organizing decks](organizing-decks.md#ways-to-tag-a-note).
2. Confirm the tag is exact. `#flashcards/biology` does not count.
3. Confirm the note contains at least one card. A tagged note with no cards is not listed.
4. Check the syntax. Basic cards need `---card---` and a separator line that is exactly `---`. Single-line cards need `::` with text on both sides. Cloze needs `==c1::text==` with no spaces inside `==c1::`. See [Writing cards](writing-cards.md).
5. Click the refresh icon on the dashboard to rebuild the index.
6. If the dashboard says "Loading decks...", wait for Obsidian to finish starting and for Lemma to scan the vault.
7. Open the developer console (`Ctrl+Shift+I`, `Cmd+Option+I` on macOS) and look for errors that mention Lemma.

## A line became a card by accident

Lemma treats any line in a deck note that contains `::` as a single-line card, for example `std::vector`. Move that text to a note that is not a deck, or rewrite the line so it does not contain `::`. Lines inside a basic card's front or back count too.

## A cloze card shows raw markers

If one paragraph holds several clozes, the front hides only the tested one. The others appear as raw `==c2::text==` markers rendered as highlights. Split the paragraph, or reduce it to one cloze per paragraph.

## Progress looks reset

A card keeps its history only while its card ID stays the same. IDs change in these cases:

- **You edited a card that has no block ID.** The ID is a hash of the note path and the card text. Add `^block-id` to cards you plan to edit.
- **You renamed or moved the deck note outside Obsidian.** The note's path is part of every card ID, with or without block IDs. When you rename or move a deck note inside Obsidian, Lemma moves each card's schedule and review history to the new IDs. A rename made while Obsidian was closed, or by another tool, looks like a deleted note and a new one, so the cards become new cards. The old history stays in the database but is not attached to anything. Whole-note review state (`#review` notes) is stored by path and does not follow a rename.
- **You changed a block ID.** That makes a new card.
- **A note stopped being a deck.** If you remove the deck tag or change the deck tag setting, Lemma drops those cards' schedules from its current state.

If you reset progress on purpose, see [Settings](settings.md#reset-progress). Review history, which feeds the statistics, is kept separately from card schedules and is not removed by editing cards.

## The review queue is smaller or larger than expected

- **Fewer cards than the due count.** A deck queue caps due cards at **Max reviews per day** minus today's reviews in that deck. See [How scheduling works](how-scheduling-works.md#which-cards-enter-a-queue).
- **Fewer new cards than the limit.** New cards you started earlier today, in any session, count against **Max new cards per day** for that deck. The count resets at midnight on your device's clock.
- **A card I rated Again did not come back.** It returns in the next queue you build after its short step is due, usually a few minutes later. Start a new session to pick it up.
- **"No cards to review in this deck!"** The deck has no due or new cards. Use the lightning icon to cram it.
- **"Daily limit reached for this deck."** The deck still has due or new cards, but today's limits are used up. Use the lightning icon to cram it, or raise the limits in settings.

## Sync problems

| Message | Likely cause and fix |
|---|---|
| "Sync is not enabled. Enable it in settings." | Turn on **Enable sync** in **Settings > Lemma > Sync** |
| "Sync URL not configured. Set it in settings." | Enter the **CouchDB server URL** |
| "Please enter both username and password" | Fill in both fields before enabling sync |
| "Sync error: ..." followed by "Sync stopped. Check cors settings and sync URL." | The server refused the request or is unreachable. Check the URL, that the server is running, and its CORS settings |
| Sync stops by itself | The server returned 401, 403 or 404, or five connection errors occurred. Check credentials, database name and permissions, then run **Sync now** |
| "Sync request timed out" | The manual sync from the dashboard waited 15 seconds. Try again on a better connection |
| "PouchDB is not enabled" | Turn on **Use PouchDB (IndexedDB)** and reload Obsidian |
| The **Sync now** command is missing | It is only registered when **Use PouchDB** is on at start-up. Reload Obsidian |

For setup steps see [Sync and data](sync-and-data.md). Remember that sync covers review data only, not your notes.

## Backup, import and undo

- **"This file is not a Lemma backup or a Lemma data.json file."** The file is not JSON written by Lemma. Choose a `Lemma backup ... .json` file or a `data.json` from the Lemma plugin folder.
- **Import finds schedules but "0 match cards in this vault".** The backup is from notes at different paths. Card IDs include the note path, so restore the folder layout, or rename the notes to their old paths with Obsidian.
- **My progress and statistics came back after updating.** Versions before 1.2.0 saved your schedules and history but could not read them back after a restart. Version 1.2.0 loads what was saved, so your earlier progress reappears.
- **Undo does nothing.** Undo only covers ratings given in the review window that is open. The undo icon is hidden until you have rated a card, and the `Z` key is ignored while the cursor is in an answer box.
- **Imported cards show line breaks or odd spacing.** A card with line breaks is written in the `---card---` format. Edit the deck note to adjust it.
- **Two vaults show each other's progress.** Vaults first set up with an older version share the database `lemma_local`. See [Sync and data](sync-and-data.md#the-local-database).

## Migration reports errors

"Migration completed with errors" means fewer cards or reviews reached the database than the file held. Cards that no longer exist in a tagged note are skipped on purpose. Make sure all decks are loaded and tagged, then run **Migrate now** again. See [Migrating](migrating.md).

## Something looks wrong on mobile

- Update Obsidian to 1.7.2 or later.
- Use the ribbon menu or the **Open dashboard** command; there is no status bar on mobile.
- If swiping does not rate, reveal the answer first. Gestures work only after the answer is shown.

## Known limitations

These behaviors come from the plugin code as shipped in 1.2.0.

- **Reversed cards.** A `:::` line creates one reversed card, not a forward and a reverse card.
- **Learning state in custom study.** The **Learning** filter means "reviewed and not yet due".
- **Review options.** There is no setting for learning steps, fuzz or per-deck limits.
- **Whole-note review** has no interval hints and does not add to streak or XP.

## Report a problem

Open an issue at [github.com/Fundaments-Work/Lemma/issues](https://github.com/Fundaments-Work/Lemma/issues). Include your Obsidian version, platform, Lemma version (shown on the About tab), what you did, and any console errors. Do not paste your CouchDB password.
