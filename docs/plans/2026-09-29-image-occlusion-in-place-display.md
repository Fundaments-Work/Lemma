# Design Plan: In-Place Image Occlusion Flashcard Display

- **Issue Reference**: [GitHub Issue #1](https://github.com/sapienskid/Lemma/issues/1)
- **Status**: Implemented
- **Date**: 2026-09-29 (Completed: 2026-10-12)

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

We define a helper function `isImageOnlyContent(content: string): boolean`:
- Strips any trailing Obsidian block IDs (`\^[a-zA-Z0-9-]+`) and surrounding whitespace.
- Checks if the remaining text consists exclusively of:
  - An Obsidian wiki-embed: `^!\[\[(.*?)\]\]$` (e.g. `![[diagram.png]]`, `![[drawing.excalidraw.svg|500]]`).
  - Standard markdown image: `^!\[(.*?)\]\((.*?)\)$` (e.g. `![diagram](assets/diagram.png)`).
- A card is deemed an in-place image card if **both** `isImageOnlyContent(card.front)` and `isImageOnlyContent(card.back)` return `true`.

---

## 4. UI & Interaction Design (`ReviewModal.ts`)

### State Machine Adjustments
- Introduce a boolean flag or sub-state in `ReviewModal`: `isInPlaceImageCard: boolean`.
- Track revealed flip view: `activeInPlaceView: 'question' | 'answer'`.

### Lifecycle:
1. **`showNextCard()`**:
   - Evaluate `isInPlaceImageCard = isImageOnlyContent(card.front) && isImageOnlyContent(card.back)`.
   - If `true`, add CSS class `fsrs-card-inplace` to `this.cardContainer`.
   - Render markdown for `frontEl` and `backEl`.
   - `frontEl.show()`, `answerContainer.hide()`.
   - Reset `activeInPlaceView = 'question'`.

2. **`showAnswer()`**:
   - For in-place image cards:
     - Hide `this.frontEl` (`this.frontEl.hide()`).
     - Show `this.answerContainer` (`this.answerContainer.show()`).
     - Set `activeInPlaceView = 'answer'`.
     - Show rating controls as usual.
   - For standard cards:
     - Keep `this.frontEl` visible and show `this.answerContainer` below it (unmodified behavior).

3. **Tap-to-Flip Interaction**:
   - In `onGestureEnd(e: PointerEvent)`:
     - If the card is an in-place image card, the modal is in `answer` state, and total drag distance (`dx^2 + dy^2 < 100` / `|dx| < 10 && |dy| < 10`):
       - Toggle between showing `frontEl` and showing `backEl`.
       - Update a small non-intrusive badge/hint (e.g. `.fsrs-inplace-indicator`: `"Answer (tap to peek question)"` vs `"Question (tap to see answer)"`).

---

## 5. Styling Changes (`styles.css`)

```css
/* In-place image occlusion cards */
.fsrs-card-inplace .fsrs-card-answer hr {
    display: none;
}

.fsrs-card-inplace .fsrs-card-front,
.fsrs-card-inplace .fsrs-card-back {
    min-height: unset;
    display: flex;
    justify-content: center;
    align-items: center;
}

.fsrs-card-inplace img {
    cursor: pointer;
    user-select: none;
    max-height: 70vh;
    object-fit: contain;
}

.fsrs-inplace-indicator {
    font-size: var(--font-ui-smaller);
    color: var(--text-muted);
    text-align: center;
    margin-top: var(--size-4-2);
    user-select: none;
}
```

---

## 6. Testing & Validation Plan

1. **Unit Tests (`tests/card-parsing.test.ts` or `tests/image-occlusion.test.ts`)**:
   - Test `isImageOnlyContent`:
     - Wiki-link images: `![[image.png]]`, `![[image.excalidraw.svg]]`, `![[image.png|600]]`.
     - Standard markdown images: `![](image.png)`, `![caption](image.png)`.
     - Block IDs: `![[image.png]] ^block123`.
     - Mixed text + image: `Look at this ![[image.png]]` -> returns `false`.
     - Non-image text -> returns `false`.
2. **Review Modal Tests / DOM Verification**:
   - Verify class `fsrs-card-inplace` is toggled appropriately.
   - Verify `frontEl` is hidden when answer is displayed for in-place cards.
   - Verify tapping flips between `frontEl` and `backEl`.
3. **Manual Mobile & Desktop Verification**:
   - Test on desktop and mobile layout with Excalidraw drawing embeds.
   - Ensure swipe-to-rate gestures still trigger smoothly when dragging > 60px.
   - Ensure standard Q&A cards and cloze cards still display front and back together.
