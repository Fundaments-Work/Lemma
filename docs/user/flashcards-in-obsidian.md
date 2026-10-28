# How to Make Flashcards in Obsidian

A practical guide to making spaced repetition flashcards inside Obsidian notes with the Lemma plugin, from your first card to reviewing on your phone.

You can make flashcards in Obsidian without leaving your notes. You install a plugin, tag a note as a deck, write cards as plain text, and review them on a schedule. This guide uses Lemma, an MIT-licensed Obsidian plugin that schedules reviews with FSRS-5. It assumes you already know how to create a note in Obsidian and nothing else about flashcards.

## Why make flashcards from your notes?

A separate flashcard app keeps your cards away from the notes they came from. When a card is wrong, you have to find the source yourself. When your understanding changes, you edit the note and the card separately.

With flashcards inside notes, the card sits next to the explanation. You can write a paragraph, then add two or three questions under it while the material is fresh. Cards are plain Markdown, so they appear in search, they can link to other notes, and you can read them without any plugin.

Flashcards rely on active recall, where you try to answer from memory before looking, and on spaced repetition, where each card returns at a growing interval. A scheduler such as FSRS predicts when each card is due, so you only review what needs it. See [How scheduling works](how-scheduling-works.md) for what Lemma does.

If you are weighing this against a dedicated app, see [Lemma vs Anki](vs-anki.md).

## What do you need?

- Obsidian 1.7.2 or later, on desktop or mobile.
- The Lemma plugin, installed from **Settings > Community plugins > Browse**. Step by step instructions are in [Getting started](getting-started.md#1-install-lemma).
- One note to hold your first cards.

## How do you make your first flashcard?

1. Create or open a note.
2. Add the deck tag. Lemma treats any note tagged `flashcards` as a deck. Put this at the very top of the note:

```yaml
---
tags: [flashcards]
---
```

3. Write a card. This is the simplest form, one line with `::` between the question and the answer:

```markdown
What is the capital of Japan?::Tokyo ^japan-capital
```

The `^japan-capital` at the end is a block ID. It is optional, but it lets you edit the card text later without losing its review history. Without it, Lemma identifies the card by its text, and any edit creates a new card. See [Writing cards](writing-cards.md#block-ids-and-review-history).

You can also run the command **Add a single-line card** from the command palette. Lemma inserts a template with a fresh block ID and tags the note for you.

A deck only appears on the dashboard once it contains at least one card. If it does not show up, click the refresh icon on the dashboard.

## What card types can you write?

Lemma reads four main formats. All of them are ordinary text in a tagged note.

### Single-line cards

```markdown
Mitochondria::Powerhouse of the cell ^cards-001
```

Good for short facts: terms, dates, formulas. Both sides must have text, and the line cannot start with a colon.

### Reversed cards

```markdown
Mitochondria:::Powerhouse of the cell ^cards-002
```

Three colons make a reversed card. It shows the right-hand side and asks you to recall the left-hand side. Lemma makes one card per line, not two. If you want both directions, write one `::` line and one `:::` line with different block IDs.

### Multi-line cards

When an answer needs several lines, a list, code or an image, use a block:

```markdown
---card--- ^cards-003
What are the three stages of cellular respiration?
---
1. Glycolysis
2. The citric acid cycle
3. The electron transport chain
---end---
```

The front is everything up to a line that is exactly `---`. The back runs until `---end---` (recommended), the next `---card---` or the end of the note. Adding `---end---` lets you write headings, outlines, and notes immediately following the card without them becoming part of the card's answer.

### Cloze deletions

A cloze hides part of a sentence. Wrap the hidden text in `==c1::` and `==`:

```markdown
The ==c1::mitochondrion== is the powerhouse of the ==c2::cell==. ^cards-004
```

Each number becomes its own card, so this sentence gives two. Use a different number for each blank, and keep one or two short clozes per paragraph. In a paragraph with several clozes, the other clozes are shown in their raw form on the front, which can reveal answers. You can select text and run **Create cloze from selection** instead of typing the markers.

Lemma also supports type-in cards, where you type the answer (add `?type`), image cards, and whole-note review. They are covered in [Writing cards](writing-cards.md).

One caution: every line in a tagged note that contains `::` becomes a card, including things like `std::vector` in your notes. Only tag notes meant to be decks, or keep such lines out of them.

## How do you organise cards into decks?

A deck is a note. To group related cards, put them in the same note and give the note a clear title, either as its file name or as a `title:` property. On the dashboard, decks are grouped by the folder that holds them. To start a new deck, run **Create new deck**, or open any existing note and run **Tag current note as flashcard deck**.

Whether to use one big note or many small ones is up to you. Small notes about a single topic make it easier to study one subject at a time. See [Organizing decks](organizing-decks.md) for tag variants, titles and folders.

## How do you review your cards?

1. Open the dashboard from the ribbon icon, the status bar, or the command **Open dashboard**.
2. Click the play icon on a deck, or **Study all due**.
3. Read the question and try to recall the answer before you reveal it. Press `Space` or `Enter`, or click **Show answer**.
4. Rate yourself: `1` Again, `2` Hard, `3` Good or `4` Easy. Each button shows when the card will come back.

Be honest with the ratings. A card you got wrong or only partly right should be Again. FSRS uses your ratings to decide the next interval, so flattering yourself makes the schedule worse. See [Reviewing](reviewing.md) for keys, type-in cards and image cards, and [Statistics and dashboard](statistics-and-dashboard.md) for progress charts.

New cards are introduced up to a daily limit, and due cards come back as their schedule says, so a short session each day is enough. The limits are in [Settings](settings.md).

## Can you make and review flashcards on a phone?

Yes. Lemma works in Obsidian on iOS and Android, and the same decks appear there. You can write card syntax directly in the editor, or use the guided card creator from the dashboard. During review you can tap the rating buttons or swipe: left for Again, down for Hard, right for Good and up for Easy. See [Mobile](mobile.md).

One point matters here. Your cards travel with your vault, but your review schedule is stored on each device. To keep a phone and a computer in step, set up Lemma's optional CouchDB sync, or move a backup file. See [Sync and data](sync-and-data.md) and [Backup and import](backup-and-import.md).

## How do you write good flashcards?

The biggest gains come from the cards themselves, not the software. These points are paraphrased from two well-known sources.

- **Understand first, then memorise.** Piotr Wozniak, creator of SuperMemo, lists understanding as his first rule, and Anki's manual quotes the same idea. Cards made from material you do not yet understand are hard to learn and quick to forget.
- **Keep each card small.** Wozniak calls this the minimum information principle: one simple, specific fact per card is easier to recall and to schedule than a paragraph. If an answer is a list, split it into several cards or use clozes.
- **Use cloze deletions.** He describes fill-in-the-blank cards as easy to write and effective. They work well on sentences you already have in your notes.
- **Avoid unordered sets and long enumerations.** Wozniak advises converting sets into enumerations, and dealing with unavoidable enumerations through cloze deletions, overlapping ones if possible.
- **Make questions unambiguous.** Cut unnecessary words so there is only one correct answer. If two cards get confused, rewrite them to tell them apart.
- **Link to what you know.** Add an example or a connection to something familiar, and note the source or date for facts that can change.
- **Make your own cards.** Anki's manual says that creating your own deck is the most effective way to learn a complex subject, and suggests shared decks supplement rather than replace outside material.
- **Try to recall first.** Anki's manual advises trying to answer before revealing, and showing the answer and moving on if you cannot answer within about ten seconds.

A useful test: if you could answer a card by recognising its shape rather than by remembering the fact, rewrite it.

## What should you do next?

- Add 10 to 20 cards from a note you are studying now, and review them tomorrow.
- Learn the remaining formats in [Writing cards](writing-cards.md).
- Read [Reviewing](reviewing.md) and [Custom study](custom-study.md) to study by tag or cram before an exam.
- Understand what the buttons do in [How scheduling works](how-scheduling-works.md) and [FSRS in Obsidian](fsrs-in-obsidian.md).
- Coming from Anki? See [Migrating](migrating.md) and [Lemma vs Anki](vs-anki.md).
- Fix problems with [Troubleshooting](troubleshooting.md).

## Sources

- [Piotr Wozniak, Effective learning: Twenty rules of formulating knowledge (SuperMemo)](https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge): understand before memorising, minimum information principle, cloze deletion, sets and enumerations, unambiguous wording, linking and sources.
- [Anki manual: Getting started](https://docs.ankiweb.net/getting-started.html): creating your own cards, shared decks as a supplement, "do not learn if you do not understand".
- [Anki manual: Studying](https://docs.ankiweb.net/studying.html): try to recall before revealing, rate honestly, the roughly ten second guideline.

Lemma facts come from the other pages of this guide and Lemma's source code, in the [Lemma repository](https://github.com/Fundaments-Work/Lemma).

Last checked: October 2026.
