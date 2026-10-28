# Design Plan: Explicit Card End Delimiter (`---end---`)

- **Status**: In progress
- **Date**: 2026-10-28
- **Target Release**: v1.3.0
- **Implementation**: `src/data/DataManager.ts`, `src/plugin/main.ts`, `src/ui/CreateCardModal.ts`, `src/data/importCards.ts`, `README.md`, `FLASHCARD_GUIDE.md`, `docs/user/writing-cards.md`, `tests/card-parsing.test.ts`

## 1. Problem Statement

In Lemma, flashcards live directly within regular markdown notes alongside headings, outlines, lists, and prose.

Historically, basic block cards split notes on `/---\s*card\s*---/i`. Within each card block, the front is separated from the back by `\n---\n`. However, there was no dedicated closing delimiter: the back ran until the next `---card---` marker or the end of the note.

Consequently, if a user wrote a flashcard followed by a new markdown heading (e.g. `## Next Topic`) or standard lecture notes, that entire heading and subsequent prose was absorbed into the card's back during review.

## 2. Goals & Constraints

1. **Explicit end delimiter**: Allow users to explicitly close a card using `---end---` (or `---card-end---`) so subsequent headings and notes are excluded from the card.
2. **100% backward compatibility**: Cards without `---end---` must continue to function identically to previous releases (running until the next `---card---` or end-of-note). Existing vaults and cards must not break.
3. **Template & command alignment**: Commands like "Add a new flashcard" and the "Create card" modal should generate blocks with `---end---` so new cards automatically follow best practices.
4. **Clean syntax & case flexibility**: Match case-insensitively with optional internal whitespace (`/---\s*(?:end|card-end)\s*---/i`).
