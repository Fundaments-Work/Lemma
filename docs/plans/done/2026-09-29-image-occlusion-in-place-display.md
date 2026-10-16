# Design Plan: In-Place Image Occlusion Flashcard Display

- **Issue Reference**: [GitHub Issue #1](https://github.com/Fundaments-Work/Lemma/issues/1)
- **Status**: Done
- **Date**: 2026-09-29 (Completed: 2026-10-12, shipped in v1.1.3)
- **Implementation**: `src/data/constants.ts`, `src/ui/ReviewModal.ts`, `styles.css`, `tests/image-occlusion.test.ts`

## 1. Problem Statement

When users review flashcards created via image occlusion (commonly generated using Excalidraw where diagrams or texts are occluded by shape masks), the current `ReviewModal` appends the answer (`backEl`) below the question (`frontEl`), separated by a horizontal rule (`<hr>`).

On mobile devices (e.g., iPhone) and smaller desktop panes:
- Cards containing tall images (such as 15–20 lines of occluded text or high-resolution diagrams) occupy the entire viewport height.
- Upon clicking "Show answer", the answer image renders below the question image, forcing the user to scroll down manually.
- The visual alignment between the occluded question and the unmasked answer is broken, defeating the primary visual benefit of image occlusion.

## 2. Goals & Success Criteria

1. **In-place display**: When reviewing an image occlusion card, revealing the answer displays the answer image at the exact same position as the question image without vertical displacement or horizontal rule.
2. **Automatic detection**: Automatically detect image-only cards where both the `front` and `back` consist strictly of an image embed.
3. **Interactive flip/peek**: Once in the `answer` state, users can tap/click the image to toggle back and forth between the question image and the answer image for easy visual comparison before rating.
4. **Gesture & keyboard friendly**:
   - Tap-to-flip must not conflict with existing swipe gesture ratings (swipe threshold: 60px; tap threshold: < 10px).
   - Standard 1-4 ratings and space/enter shortcuts remain functional.
5. **Zero regressions**: Text cards, cloze cards, and type-in cards remain completely unaffected.

---

## 3. Detection Strategy

Two helpers ship in `src/data/constants.ts`:

- **`isImageOnlyContent(content: string): boolean`** — treats a string as an image-only embed when, after stripping a trailing Obsidian block ID (`^[a-zA-Z0-9-]+`) and whitespace, the remainder is either a wiki-embed (`![[...]]`, including size and alias pipes) or a standard markdown image (`![...](...)`, including remote URLs and titles). Both wiki and markdown forms are accepted.
- **`isInPlaceImageCard(card): boolean`** — returns `true` when both `card.front` and `card.back` are image-only. `ReviewModal` calls this rather than re-deriving the condition, so detection stays in one place.

Type-in cards are excluded from in-place mode (`card.type !== 'typein'`) so the typing input is never displaced.

---

## 4. UI & Interaction Design (`ReviewModal.ts`)

### State
- `isInPlaceImage: boolean` — recomputed per card in `showNextCard()` via `isInPlaceImageCard(card)`, which also excludes type-in cards.
- `activeInPlaceView: 'question' | 'answer'` — reset on every new card.
- `inplaceIndicatorEl` — a `.fsrs-inplace-indicator` div created once with the card container, hidden by default.

### Lifecycle:
1. **`showNextCard()`**:
   - Set `isInPlaceImage`, and reset `activeInPlaceView = 'question'`.
   - Toggle the `fsrs-card-inplace` class on `cardContainer`.
   - Hide `inplaceIndicatorEl`.

2. **`showAnswer()`**:
   - For in-place image cards:
     - Hide `this.frontEl` (`this.frontEl.hide()`).
     - Show `this.answerContainer` (`this.answerContainer.show()`).
     - Set `activeInPlaceView = 'answer'`.
     - Show the indicator reading `"Answer (tap to peek question)"`.
   - For standard cards:
     - Keep `this.frontEl` visible and show `this.answerContainer` below it (unmodified behavior).

3. **Tap-to-Flip Interaction**:
   - In the pointer handler, when the card is in-place, the state is `answer`, and total drag distance stays under the tap threshold (`Math.hypot(dx, dy) < 10`):
     - Call `toggleInPlaceView()` to switch between `frontEl` and `backEl`.
     - The indicator mirrors the state: `"Question (tap to see answer)"` versus `"Answer (tap to peek question)"`.

4. **Keyboard Peek** (added during implementation):
   - In the `answer` state, `Space`, `Enter`, `P`, or `F` toggles the peek for in-place cards, then returns early so the keystroke is not swallowed by the rating switch.

---

## 5. Styling Changes (`styles.css`)

```css
/* In-place image occlusion cards */
.fsrs-card-inplace .fsrs-card-answer {
    margin-top: 0;
}

.fsrs-card-inplace .fsrs-card-answer hr {
    display: none;
}

.fsrs-card-inplace .fsrs-card-front,
.fsrs-card-inplace .fsrs-card-back {
    min-height: unset;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
}

.fsrs-card-inplace .image-embed,
.fsrs-card-inplace .media-embed,
.fsrs-card-inplace p {
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
}

.fsrs-card-inplace img {
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-user-drag: none;
    max-height: 70vh;
    object-fit: contain;
}

.fsrs-inplace-indicator {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    text-align: center;
    margin-top: var(--size-4-2);
    user-select: none;
    cursor: pointer;
}
```

The embed and paragraph wrappers are centered as flex rows so the image occupies the
same box regardless of which side is displayed, and drag/selection are disabled on
images so a tap reads as a peek rather than a drag. A mobile media query further
constrains image height on small screens.

---

## 6. Testing & Validation (completed)

`tests/image-occlusion.test.ts` covers the detection layer:

1. **Unit Tests (`tests/image-occlusion.test.ts`)**:
   - `isImageOnlyContent` for wiki-link images: `![[image.png]]`, `![[photo.JPG]]`, and the other raster, vector, animated, and `excalidraw` variants, plus size and alias pipes (`![[image.png|600]]`, `![[drawing.excalidraw|500]]`) and subfolder paths.
   - Standard markdown images: `![](image.png)`, `![caption](image.png)`, relative asset paths, remote URLs, and titled images.
   - Block IDs: `![[image.png]] ^block123`, `^fsrs-abc123`, and block IDs on their own line.
   - Negative cases: mixed text with an embed (`Look at this ![[image.png]]`) and plain text return `false`.
   - `isInPlaceImageCard` requires both sides to be image-only.
2. **Review Modal DOM Verification**:
   - Verified manually that `fsrs-card-inplace` is toggled per card, `frontEl` is hidden when the answer is revealed, and tapping or pressing `Space`/`P`/`F` flips the view.
3. **Manual Mobile & Desktop Verification**:
   - Confirmed on desktop and mobile layouts with Excalidraw embeds.
   - Swipe-to-rate still triggers past the 60px threshold without a competing tap.
   - Standard Q&A, cloze, and type-in cards are unaffected.
