# Organizing Decks

Each note tagged with the deck tag is one deck. Learn how Lemma finds decks, names them, groups them by folder on the dashboard and keeps them up to date.

## One note is one deck

Lemma has no separate deck objects. A deck is a Markdown note that:

1. carries the deck tag, which is `flashcards` unless you change it, and
2. contains at least one card.

A tagged note with no cards does not appear on the dashboard. Notes without the tag are ignored, even if they contain text such as `Q::A`.

Lemma only reads Markdown notes (`.md`). It does not read attachments or other plugins' data.

## Ways to tag a note

Any of these makes a note a deck when the tag is `flashcards`:

- Frontmatter list: `tags: [flashcards]`
- Frontmatter block list:
  ```yaml
  tags:
    - flashcards
  ```
- Frontmatter text: `tags: flashcards`, or a comma-separated text such as `tags: flashcards, biology`
- Inline tag anywhere in the note: `# Cell Biology #flashcards`

Matching ignores case and accepts the tag with or without `#`. The match is exact, so a nested tag such as `#flashcards/biology` does not make a deck on its own. A frontmatter `tag:` key works as well as `tags:`.

The commands **Create new deck** and **Tag current note as flashcard deck** add the tag for you. The card commands and the guided card creator also add it to the current note automatically.

## Deck titles

The deck's name on the dashboard is the `title` property in frontmatter if the note has one, otherwise the file name without `.md`. The dashboard sorts decks alphabetically by that name.

## Folders on the dashboard

The dashboard groups decks by the folder that holds the note.

- Notes at the top level of the vault are grouped under **Root**.
- Only the last folder name is shown, so `School/Biology` appears as **Biology**.
- Each folder row shows how many decks it holds, and a second number for how many cards in it are due.
- Folders start collapsed. Click a folder, or focus it and press `Enter` or `Space`, to expand it.

Each deck row shows the due count and new count, and three buttons: study, cram and browse. Clicking the row itself opens the deck note.

Two folders with the same last name are shown as separate groups, because grouping uses the full folder path.

## Changing the deck tag

1. Open **Settings > Lemma > General**.
2. In **Deck tag**, enter the tag name without the `#`, for example `cards`.

Lemma re-scans your vault as soon as you change the field. Notes carrying the old tag stop being decks until you tag them with the new one. If a note stops being a deck, Lemma drops its cards from the current session's state, so avoid removing the tag from decks you are still studying. See [Troubleshooting](troubleshooting.md#progress-looks-reset).

## Keeping decks up to date

Lemma watches the vault. When you create, edit, rename or delete a Markdown note, it re-reads that note about 350 ms after the last change and updates the dashboard. Unchanged notes are skipped using their modification time. If something looks stale, click the refresh icon on the dashboard to rebuild the whole index.

## Whole-note review notes

Notes tagged `#review` are not decks. They are listed by the **Review due notes** command instead. See [Reviewing](reviewing.md#whole-note-review).

## Tips for structuring decks

- Use headings inside a deck note. They appear as the context line above each card during review.
- Put related decks in one folder so they group together on the dashboard.
- Add extra tags such as `biology` or `chapter-1` to deck notes. [Custom study](custom-study.md) can filter sessions by those tags.
- Prefer several focused notes over one very large note; each is a separate deck with its own queue.
