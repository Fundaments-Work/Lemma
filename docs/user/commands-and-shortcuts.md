# Commands and Shortcuts

Reference for every Lemma command in the Obsidian command palette, the review window keys, swipe gestures, the editor menu action and the dashboard controls.

## Commands

Open the command palette (`Ctrl+P`, or `Cmd+P` on macOS) and type the command name. Obsidian shows Lemma commands with the plugin name in front, for example "Lemma: Open dashboard". Lemma assigns no hotkeys by default. To add one, go to **Settings > Hotkeys**, search for "Lemma" and assign a key.

| Command | What it does | Needs |
|---|---|---|
| **Open dashboard** | Opens the Lemma deck overview as a tab | |
| **Create card (guided modal)** | Opens the card creator with a card type dropdown and a live preview | |
| **Create new deck** | Creates a note with the deck tag and opens it | |
| **Tag current note as flashcard deck** | Adds the deck tag to the open note's frontmatter | An open note |
| **Add a new flashcard** | Inserts a basic `---card---` block with a new block ID | Editor |
| **Add a single-line card** | Inserts `Question::Answer ^id` and selects the first word | Editor |
| **Add a reversed card** | Inserts `Question:::Answer ^id` | Editor |
| **Add a cloze card** | Inserts `Sentence with ==c1::hidden text==.` | Editor |
| **Create cloze from selection** | Wraps the selected text in `==cN::...==` | Editor |
| **Add a type-in card** | Inserts a basic block with the `?type` flag | Editor |
| **Add a type-in single-line card** | Inserts `Question::Answer ?type ^id` | Editor |
| **Import cards from file** | Converts a plain text export from another flashcard app, or a CSV or TSV file, into a new deck note | |
| **Export review data (backup)** | Saves all schedules, review history and streak data as `Lemma backup <date and time>.json` in the vault root | |
| **Import review data from backup** | Merges a Lemma backup, or a `data.json` file from any version, into your data | |
| **Review due notes** | Starts a whole-note review of due `#review` notes | |
| **Sync now** | Restarts CouchDB sync | PouchDB on, sync enabled and a URL set |
| **Check sync status** | Shows sync state, server address, document count and last sync | PouchDB on |
| **Reset all card progress (nuclear option)** | Opens the reset confirmation window | |

Notes:

- The card insertion commands also add the deck tag to the current note if it is missing.
- **Add a new flashcard** and **Add a type-in card** insert a blank line before the card, then leave the cursor on the question line.
- **Create cloze from selection**: when a selection exists, the cloze number is one higher than the first cloze already on the cursor's line, or 1 if there is none. With no selection it inserts `==c1::text==`.
- **Sync now** and **Check sync status** are registered at start-up only while **Use PouchDB (IndexedDB)** is on. Reload Obsidian after changing that setting.

## Editor menu

Select text in a note, right-click (or long-press on mobile) and choose **Create cloze from selection**. This does the same as the command and does not add the deck tag.

## Review window keys

| Key | When | Action |
|---|---|---|
| `Space` or `Enter` | Question shown | Show the answer |
| `1` | Answer shown | Again |
| `2` | Answer shown | Hard |
| `3` | Answer shown | Good |
| `4` | Answer shown | Easy |
| `Space`, `Enter`, `P`, `F` | Image card, answer shown | Toggle between question and answer images |
| `Enter` | Type-in box | Check the answer |
| `Esc` | Any time | Close the window; ratings so far are kept |

## Whole-note review keys

`1`, `2`, `3` and `4` rate the note as Again, Hard, Good and Easy. `Esc` closes the window.

## Browse window keys

| Key | Action |
|---|---|
| Left arrow | Previous card |
| Right arrow | Next card |
| `Esc` | Close |

## Guided creator keys

| Window | Key | Action |
|---|---|---|
| Create flashcard | `Ctrl+Enter` (`Cmd+Enter`) | Insert the card |
| Create new deck | `Enter` | Create the deck |

## Swipe gestures

After the answer is shown, in the review window:

| Gesture | Rating |
|---|---|
| Swipe left | Again |
| Swipe down | Hard |
| Swipe right | Good |
| Swipe up | Easy |

Tapping or clicking an image card toggles between question and answer without rating.

## Dashboard controls

| Control | Action |
|---|---|
| Ribbon icon "Open Lemma dashboard" | Opens the dashboard |
| Status bar "Lemma" (desktop) | Opens the dashboard |
| **Study all due** | One session across all decks |
| **New deck**, **New card** | Guided creators |
| **Statistics** | Statistics window |
| **Custom study** | [Custom study](custom-study.md) form |
| Help icon | **Help & guide** window |
| Refresh icon | Rebuild the deck index |
| Cloud icon | Manual sync (sync enabled only) |
| Play, lightning and list icons on a deck row | Study queue, cram all, browse |

See [Reviewing](reviewing.md) for what each review action does.
