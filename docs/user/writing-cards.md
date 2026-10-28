# Writing Cards

Write Lemma flashcards as plain Markdown in a tagged note: basic blocks, single-line and reversed cards, cloze deletions, image occlusion and type-in.

Lemma reads cards from any note that carries the deck tag (see [Organizing decks](organizing-decks.md)). Cards are never imported or exported; the text in your note is the card.

## Basic cards

A basic card is a block with a front and a back, separated by a line containing only `---`.

```markdown
---card--- ^basic-001
What is the function of the ribosome?
---
Protein synthesis via translation of mRNA.
---end---
```

Rules the parser follows:

- The block starts with `---card---`. The match is case-insensitive.
- The front is everything up to the first line that is exactly `---`. The back is everything after it, up to an explicit `---end---`, the next `---card---` or the end of the note.
- An optional `---end---` (or `---card-end---`) explicitly closes the card so subsequent headings, subheadings, and notes remain outside the answer.
- Front and back can hold any Markdown: lists, math, code, tables, images, links and callouts. They are rendered with Obsidian's own Markdown renderer.
- The optional `^block-id` goes at the end of the front section. See [Block IDs](#block-ids-and-review-history).
- A card with an empty front or empty back is ignored.

## Single-line cards

A single-line card is one line with `::` between question and answer.

```markdown
What is the capital of Japan?::Tokyo ^single-001
```

- Both sides must be non-empty.
- The line cannot start with a colon.
- Single-line cards do not span lines. For multi-line content use a basic card.

Lemma checks every line of a deck note for `::`. A line in your notes that happens to contain `::`, for example `std::vector`, becomes a card. Lines that start with `---card---`, lines that are exactly `---`, and lines that contain cloze syntax are skipped. Lines inside a basic card's front or back are not skipped, so avoid `::` there.

## Reversed cards

Use `:::` (three colons) for a reversed card.

```markdown
Mitochondria:::Powerhouse of the cell ^rev-001
```

A reversed card shows the right-hand side as the question and asks you to recall the left-hand side. Lemma creates one card per `:::` line. It does not also create the forward card. If you want both directions, write two lines: one with `::` and one with `:::`, each with its own block ID.

## Cloze deletions

Wrap the text to hide in `==cN::` and `==`, where `N` is a number.

```markdown
The ==c1::mitochondrion== is the powerhouse of the ==c2::cell==. ^cloze-001
```

- Every cloze number in a paragraph becomes its own card, scheduled independently. The example above gives two cards.
- During review the front shows the hidden text as `[...]` and the back shows the full sentence.
- A paragraph is a run of lines with no blank line between them. All clozes in one paragraph are grouped.
- A block ID after the paragraph makes IDs stable: the card IDs become `<block-id>-1`, `<block-id>-2` and so on.
- Write the marker exactly as `==c1::text==`, with no spaces inside `==c1::`.

Use a different number for each blank. Two blanks with the same number in one paragraph produce a single card with both blanks hidden together.

When a paragraph has several clozes, each card hides its own blank with `[...]` while all other clozes in the paragraph are displayed cleanly as normal text. You can also provide an optional hint using `==c1::answer::hint==`, which displays `[hint]` on the front instead of `[...]`.

To create a cloze quickly, select text in the editor and run **Create cloze from selection**, or right-click the selection and choose **Create cloze from selection**. See [Commands and shortcuts](commands-and-shortcuts.md).

## Image occlusion cards

If both the front and the back are a single image embed, Lemma treats the card as an in-place image card. The question image is replaced by the answer image in the same position, with no scrolling.

```markdown
![[anatomy-masked.png]]::![[anatomy-revealed.png]] ^occlusion-001
```

The block form works too:

```markdown
---card--- ^occlusion-002
![[anatomy-masked.svg|500]]
---
![[anatomy-revealed.svg|500]]
```

Lemma detects an image card when each side is exactly one embed, either `![[file.ext]]` (optionally with `|size`) or `![alt](path)`, and the file extension is one of: png, jpg, jpeg, gif, webp, svg, bmp, avif, tiff, excalidraw. An embed of an Excalidraw note (`.excalidraw.md`) counts too. Lemma does not draw the masks for you; you prepare the two images yourself. See [Reviewing](reviewing.md#image-cards) for how peeking works.

## Type-in cards

Add `?type` to a card to make yourself type the answer.

Single-line form:

```markdown
?type What is the SI unit of electric current?::Ampere ^typein-001
```

Block form, with the flag after `---card---`:

```markdown
---card--- ?type ^typein-002
What is the powerhouse of the cell?
---
Mitochondria
```

`?type` also works on a `:::` reversed line. Lemma removes the flag from the text before showing the card. See [Reviewing](reviewing.md#type-in-cards) for how answers are judged.

## Whole-note review

To review an entire note instead of cards, tag it `#review` in its frontmatter or anywhere in the body.

```markdown
---
tags: [review]
---
Notes on quantum mechanics
```

The note itself is scheduled with FSRS. Start these sessions with the command **Review due notes**. A note can be both a deck and a review note if it has both tags.

## Block IDs and review history

Lemma identifies each card so it can keep its schedule.

- With a block ID such as `^fsrs-abc123`, the card ID is based on the deck note's path and that ID. You can edit the card text freely and keep its history.
- Without a block ID, the ID is a hash of the file path and the card text. Editing the text creates a new card with no history, and the old history is orphaned.
- IDs may contain letters, digits and hyphens. The commands and guided creator generate IDs that look like `fsrs-k3j9x2`.
- For a single-line card the ID goes at the end of the line, after a space. For a basic card it goes at the end of the front section. For a cloze paragraph it goes at the end of the paragraph.
- Card IDs include the deck note's path. Renaming or moving a deck note inside Obsidian moves each card's history to its new ID. A rename made outside Obsidian is not detected, and those cards start as new. See [Troubleshooting](troubleshooting.md#progress-looks-reset).

Give every card you care about a block ID. The easiest way is to let the commands or the guided creator add one.

## What you can put in a card

Card sides are rendered by Obsidian, so these work: bold and italic, internal links, images, LaTeX math with `$...$` and `$$...$$`, code blocks, tables, lists, callouts and embeds. Plain `==highlight==` works as long as it is not in the cloze form `==cN::...==`.

## Card context

While reviewing, Lemma shows the heading path above the card, such as `Chapter 2 > Definitions`, taken from the Markdown headings that precede it in the note. This helps when similar questions appear in different sections.

## Inserting cards with commands

The command palette has templates for each format: **Add a new flashcard**, **Add a single-line card**, **Add a reversed card**, **Add a cloze card**, **Add a type-in card** and **Add a type-in single-line card**. Each inserts a template with a fresh block ID (the cloze template has none) and tags the current note as a deck if it is not one already. The full list is in [Commands and shortcuts](commands-and-shortcuts.md).
