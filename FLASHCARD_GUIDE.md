# Lemma - Flashcard Creation Guide

A complete guide to creating flashcards in Obsidian using the Lemma plugin.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Cards](#basic-cards)
3. [Single-Line & Reversed Cards](#single-line--reversed-cards)
4. [Cloze Deletion Cards](#cloze-deletion-cards)
5. [Image Occlusion Cards](#image-occlusion-cards-in-place-display)
6. [Type-In Active Recall Cards](#type-in-active-recall-cards)
7. [Whole-Note Review](#whole-note-review)
8. [Guided Card & Deck Creation](#guided-card--deck-creation)
9. [Card IDs & Editing](#card-ids--editing)
10. [Markdown Support](#markdown-support)
11. [Quick Commands & Shortcuts](#quick-commands)
12. [Best Practices](#best-practices)

---

## Getting Started

### 1. Create a Deck

Any note with the `#flashcards` tag (default) becomes a deck. Add the tag to frontmatter or as an inline tag:

**Frontmatter method:**
```yaml
---
tags: [flashcards]
---
```

**Inline method:**
```markdown
# My Study Notes #flashcards
```

### 2. Add Cards

Add cards to your deck using the syntax described below. The plugin will automatically detect and index them.

### 3. Study

Open the **Lemma dashboard** via:
- Right-side status bar **Lemma** button
- Command palette: `Open dashboard`

---

## Basic Cards

Basic cards have a **front** (question) and **back** (answer).

### Syntax

```markdown
---card--- ^block-id
Front content here
---
Back content here
```

### Examples

**Simple Q&A:**
```markdown
---card--- ^fsrs-abc123
What is the capital of France?
---
Paris
```

**With Markdown Formatting:**
```markdown
---card--- ^fsrs-def456
What is the formula for **Einstein's mass-energy equivalence**?
---
$E = mc^2$

Where:
- $E$ = energy
- $m$ = mass
- $c$ = speed of light
```

**With Lists:**
```markdown
---card--- ^fsrs-ghi789
Name the three states of matter
---
1. Solid
2. Liquid
3. Gas

*Bonus: Plasma is the fourth state*
```

**Multi-line Back:**
```markdown
---card--- ^fsrs-jkl012
Explain the process of photosynthesis
---
Photosynthesis is the process by which plants convert:

**Light energy** → **Chemical energy**

The basic equation:
$$6CO_2 + 6H_2O + light \rightarrow C_6H_{12}O_6 + 6O_2$$
```

### Card Delimiter

- Start with `---card---` (case insensitive)
- Separate front/back with a single `---` line
- The `^block-id` is optional but recommended for stable card identities

---

## Cloze Deletion Cards

Cloze cards hide specific words/phrases within a sentence. Great for:
- Fill-in-the-blank style learning
- Memorizing definitions in context
- Language learning

### Syntax

```markdown
==c1::hidden text==
```

- `c1` = cloze number (supports c1, c2, c3, etc.)
- `hidden text` = the content to be hidden during review

### Examples

**Single Cloze:**
```markdown
The capital of France is ==c1::Paris==.
```

**Multiple Clozes (same paragraph):**
```markdown
==c1::Mitochondria== is the powerhouse of the cell, producing ==c2::ATP== through cellular respiration.
```

**Sequential Learning (c1, c2, c3):**
```markdown
The three branches of the US government are: ==c1::Legislative==, ==c2::Executive==, and ==c3::Judicial==.
```

**With Block ID for editing:**
```markdown
The quadratic formula is ==c1::x = (-b ± √(b² - 4ac)) / 2a==. ^my-math-card
```

### How Cloze Cards Display

| Original | Front Shows | Back Shows |
|----------|-------------|------------|
| `The ==c1::capital== of France` | `The [...] of France` | `The capital of France` |

### Important Notes

- Each cloze number creates a **separate card**
- `==c1::text==` and `==c2::text==` in the same paragraph = 2 cards
- Clozes must be in the **same paragraph** to be grouped
- Empty lines break paragraphs (creates separate cards)

---

## Card IDs & Editing

### Why Use Block IDs?

Block IDs (`^unique-id`) ensure your cards maintain their review history even when you edit them.

**Without Block ID:**
- Card ID is generated from file path and front content hash
- Editing the front resets your review history

**With Block ID:**
- Card ID is based on the persistent block ID
- Edit freely without losing review history

### Generating Block IDs

Use the command palette: **`Add a new flashcard`**

This inserts a template with a pre-generated ID:
```markdown
---card--- ^fsrs-a1b2c3

---

```

### Manual ID Format

- Start with `fsrs-` (recommended) or use any alphanumeric string
- Example valid IDs: `^fsrs-abc123`, `^my-card-001`, `^chemistry-5`
- Place at the end of the front section, after `---card---`

---

## Markdown Support

All Obsidian Markdown features work in cards:

| Feature | Example |
|---------|---------|
| **Bold/Italic** | `**bold**`, `*italic*` |
| **Links** | `[[Internal Link]]`, `[External](url)` |
| **Images** | `![[image.png]]` |
| **Math (LaTeX)** | `$inline$`, `$$block$$` |
| **Code** | `` `inline` `` or code blocks |
| **Tables** | Standard Markdown tables |
| **Lists** | `- bullet`, `1. numbered` |
| **Highlight** | `==highlight==` (except cloze syntax) |
| **Embeds** | `![[Another Note]]` |
| **Callouts** | `> [!info]` |

### Example with Full Formatting

```markdown
---card--- ^fsrs-full-example
What is the **Pythagorean theorem**?
---
In a right triangle:

$$a^2 + b^2 = c^2$$

Where:
| Variable | Meaning |
|----------|---------|
| $a, b$ | Legs of the triangle |
| $c$ | Hypotenuse |

> [!tip] Remember: The hypotenuse is always the longest side!

See also: [[Geometry Basics]]
```

---

## Single-Line & Reversed Cards

Single-line cards let you author atomic question-answer pairs quickly on a single line.

### Syntax

```markdown
Question::Answer ^block-id
Reversed Question:::Reversed Answer ^block-id
```

- `::` creates a standard flashcard (prompt front, reveal back).
- `:::` creates one reversed card (prompts the back, tests the front). For two-way recall such as vocabulary, write a `::` line and a `:::` line, each with its own block ID.
- An optional `^block-id` stabilizes card history.

### Examples

```markdown
What is the speed of sound in air?::Approximately 343 m/s ^snd-001
Neuron Soma:::Cell body containing the nucleus and organelles ^neuro-002
```

---

## Image Occlusion Cards (In-Place Display)

Image occlusion cards swap occluded diagrams with unmasked answer diagrams directly in-place without vertical displacement.

### Syntax

Single-line or block syntax where both front and back contain image embeds:

```markdown
![[diagram-masked.png]]::![[diagram-revealed.png]] ^occlusion-001
```

Or block format:
```markdown
---card--- ^occlusion-002
![[anatomy-masked.svg|500]]
---
![[anatomy-revealed.svg|500]]
```

### Review Interactions
- **In-place swap**: Revealing the answer replaces the occluded diagram with the revealed diagram at the exact same position.
- **Tap to peek**: Tap/click the diagram or press `Space` / `P` / `F` to toggle back and forth between the occluded question and revealed answer masks before submitting your rating.
- **Responsive scaling**: Tall diagrams are contained within viewport limits (`70vh` desktop, `45vh` landscape) with drag and text selection disabled on mobile.

---

## Type-In Active Recall Cards

Type-in cards require you to actively type your answer before viewing the correct answer and rating options.

### Syntax

Add `?type` to single-line or block cards:

```markdown
?type What is the capital of Canada?::Ottawa ^type-001
```

Or block format:
```markdown
---card--- ?type ^type-002
What is the SI unit of force?
---
Newton
```

### Review Experience
During review, an input box appears. Press `Enter` or click `Check` to receive instant feedback:
- **Correct** (exact match)
- **Close match** (keyword match)
- **Not correct**
Full rating buttons (`Again`, `Hard`, `Good`, `Easy`) are revealed for honest self-assessment.

---

## Whole-Note Review

Apply FSRS spaced repetition to entire notes instead of breaking them into flashcards.

### Syntax

Add `#review` to frontmatter or anywhere in the note body:

```yaml
---
tags: [review]
---
# Quantum Mechanics Summary
```

Study whole notes via the command `Review due notes`.

---

## Guided Card & Deck Creation

Lemma includes interactive modals so you never have to memorize Markdown delimiters.

### 1. Guided Card Creator Modal
Run the command `Create card (guided modal)` or click **+ New card** on the Lemma dashboard:
- Pick the target deck note.
- Select card type from the dropdown.
- Fill in the Question and Answer fields.
- View live Markdown syntax preview.
- Press `Ctrl + Enter` (or `Cmd + Enter`) to insert the card with an automatic block ID and auto-deck tag.

### 2. Guided Deck Creator Modal
Click **+ New deck** on the Lemma dashboard or run the command `Create new deck`:
- Enter deck title.
- Optional folder path.
- Automatically creates the note, tags it with `#flashcards`, and opens it.

### 3. Tag Note as Flashcard Deck
Run the command `Tag current note as flashcard deck` on any existing note to immediately register it in Lemma.

---

## Quick Commands

| Command | Action | Hotkey |
|---------|--------|--------|
| `Create card (guided modal)` | Open interactive card creator | - |
| `Create new deck` | Create note pre-tagged as a deck | - |
| `Tag current note as flashcard deck` | Add deck tag to active file | - |
| `Add a new flashcard` | Insert basic card template | - |
| `Add a single-line card` | Insert `Q::A` template | - |
| `Add a reversed card` | Insert `Q:::A` template | - |
| `Add a cloze card` | Insert cloze template | - |
| `Create cloze from selection` | Wrap selected text in `==c1::...==` | - |
| `Add a type-in card` | Insert type-in block card template | - |
| `Add a type-in single-line card` | Insert `Q::A ?type` template | - |
| `Open dashboard` | Open study dashboard | - |
| `Review due notes` | Start whole-note review queue | - |
| `Sync Now` | Manual sync (if enabled) | - |
| `Check Sync Status` | View sync status | - |

### Review Session Hotkeys & Gestures

| Key / Gesture | Action |
|---------------|--------|
| `Space` / `Enter` | Show answer |
| `Space` / `P` / `F` | Peek / toggle between occluded & answer masks (image cards) |
| `1` | Rate: Again |
| `2` | Rate: Hard |
| `3` | Rate: Good |
| `4` | Rate: Easy |
| `Esc` | Exit review session |
| `←` / `→` | Navigate (Browse mode) |
| `Swipe left` | Rate: Again |
| `Swipe down` | Rate: Hard |
| `Swipe right` | Rate: Good |
| `Swipe up` | Rate: Easy |

---

## Best Practices

### Card Design

1. **One concept per card** - Don't overload cards with information
2. **Be specific** - "What is 2+2?" > "What are some math facts?"
3. **Use your own words** - Aids comprehension and retention
4. **Include context** - Brief context helps trigger memory

### Cloze Tips

```markdown
Avoid: The ==c1::quick brown fox jumps over the lazy dog==.
Better: The ==c1::quick brown fox== jumps over the lazy dog.

Avoid: ==c1::Paris== is the capital of ==c2::France== and has ==c3::2.1 million== people.
Better: Split into focused clozes or separate cards
```

### Organization

```markdown
---
tags: [flashcards, chemistry, organic]
---

# Organic Chemistry - Alkanes #flashcards

## Basic Definitions

---card--- ^chem-001
What is the general formula for alkanes?
---
$C_nH_{2n+2}$

Examples:
- Methane: $CH_4$
- Ethane: $C_2H_6$

---card--- ^chem-002
What type of bonds do alkanes contain?
---
Only **single covalent bonds** (C-C and C-H)

This makes them ==c1::saturated== hydrocarbons. ^chem-003
```

### Tagging for Custom Study

Use tags in your deck notes to enable filtered study sessions:

```markdown
---
tags: [flashcards, biology, chapter-1, exam-prep]
---
```

Then use **Custom Study Session** → Filter by Tags: `#biology, #exam-prep`

---

## Troubleshooting

### Cards Not Appearing?

1. Check that the file has the `#flashcards` tag
2. Verify syntax (especially `---` separators for basic cards)
3. Check the **Dashboard** → Refresh button
4. Look for console errors (Ctrl+Shift+I)

### Review Progress Reset?

- You likely edited a card without a block ID
- Always use `^block-id` for cards you plan to edit

### Cloze Not Working?

- Ensure syntax is exactly `==c1::text==` (no spaces)
- Check that clozes are in the same paragraph
- Verify the paragraph is in a `#flashcards` tagged file

---

## Examples Deck

```markdown
---
tags: [flashcards]
---

# Sample Flashcard Deck

## Geography

---card--- ^geo-001
What is the largest ocean on Earth?
---
The **Pacific Ocean**

It covers approximately ==c1::63 million square miles==. ^geo-002

## Programming

---card--- ^code-001
What does the `map()` function do in JavaScript?
---
Creates a new array by applying a function to every element.

```javascript
const doubled = [1, 2, 3].map(x => x * 2);
// Result: [2, 4, 6]
```

## Spaced Repetition Facts

The ==c1::Forgetting Curve== was discovered by ==c2::Hermann Ebbinghaus== in ==c3::1885==. ^sr-001

FSRS stands for ==c1::Free Spaced Repetition Scheduler==. ^sr-002
```

---

## Support Development

If Lemma helps you learn faster and retain more knowledge, consider supporting its development:

- **Buy Me a Momo:** [buymemomo.com/usefundaments](https://buymemomo.com/usefundaments)
- **GitHub:** [github.com/Fundaments-Work/Lemma](https://github.com/Fundaments-Work/Lemma)

---

Happy studying!
