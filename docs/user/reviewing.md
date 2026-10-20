# Reviewing

Use the Lemma review window to show a card, reveal the answer and rate your recall with Again, Hard, Good or Easy using the mouse, keys or swipe gestures.

## Start a review

From the dashboard you can start four kinds of session:

| Where | What it does |
|---|---|
| **Study all due** button | Builds one queue from every deck (due cards first, then new cards, each deck capped by the daily limits) |
| Play icon on a deck row | Reviews that deck's queue. The icon is dimmed when nothing is due, but still starts the deck's queue if it has new cards |
| Lightning icon on a deck row (**Cram all cards**) | Reviews every card in the deck, due first, then new, ignoring daily limits |
| **Custom study** button | Opens a form to filter cards. See [Custom study](custom-study.md) |

The number on **Study all due** is the count of due cards across all decks. The queue it opens also includes new cards up to your daily new-card limit. The command **Review due notes** starts whole-note review instead.

Cram sessions still record ratings and change card schedules. They are not a "preview" mode.

## The review window

The window title shows the deck name and a counter badge such as `1/20`. In sessions that mix decks, the title reads "Reviewing". Above the card, a small line shows the heading path where the card sits in its note.

1. Read the front of the card.
2. Click **Show answer**, or press `Space` or `Enter`.
3. The back appears below a divider, and four rating buttons appear.
4. Rate the card. Lemma saves the result and shows the next card.

The font size of card text follows the **Review font size** setting. The pencil icon in the window header is labeled "Edit this card" and opens the deck note, closing the review.

When the queue is empty, the window shows **Session complete!** with the number of cards you completed and a **Return to dashboard** button.

## Rating buttons

After the answer is shown you choose how well you remembered:

| Button | Key | Meaning |
|---|---|---|
| Again | `1` | You did not remember it. The card goes back to a short learning step |
| Hard | `2` | You remembered it with serious difficulty |
| Good | `3` | You remembered it after some thought |
| Easy | `4` | You remembered it effortlessly |

Each button shows a small interval hint: `<1d` for under a day, then days (`4d`), months (`1.5m`) or years (`1.2y`). The hints are what Lemma would schedule right now for that rating. Use them to sanity-check the choice, but rate by how well you actually recalled the answer. See [How scheduling works](how-scheduling-works.md).

## Keyboard keys

| Key | When | Action |
|---|---|---|
| `Space` or `Enter` | Question shown | Show the answer |
| `1`, `2`, `3`, `4` | Answer shown | Rate Again, Hard, Good, Easy |
| `Space`, `Enter`, `P` or `F` | Image card, answer shown | Toggle between the question image and the answer image |
| `Z` | After the first rating | Undo the last rating (also the undo icon beside the close button) |
| `Esc` | Any time | Close the window |

Undo restores the card's previous schedule, removes the rating from your history and statistics, and restores your streak and XP counters. It works as many times as you have rated cards in this window. Keys are ignored while you type in an answer box.

A card you rate Again, or a new card you rate Hard or Good, comes back a few cards later in the same session when its short step is due within 30 minutes, so the counter can grow during a session.

`P` and `F` are lowercase letters; with Caps Lock on they may not register. The Browse window uses the left and right arrow keys; see [Browsing a deck](#browsing-a-deck).

## Swipe gestures

After the answer is shown you can rate by dragging the card. Gestures use pointer events, so they work with a finger on mobile and also with a mouse drag on desktop.

| Gesture | Rating |
|---|---|
| Swipe left | Again |
| Swipe down | Hard |
| Swipe right | Good |
| Swipe up | Easy |

A swipe counts once you have moved at least 60 pixels; the larger of the horizontal and vertical movement decides the direction. While you drag, the card tilts and shifts to show which way you are heading. Gestures do nothing before the answer is shown.

## Type-in cards

On a card marked `?type` there is no **Show answer** button. Instead a text box appears.

1. Type your answer.
2. Press `Enter` or click **Check**.
3. Lemma shows one of three verdicts and the correct answer, and reveals the rating buttons.

The verdicts are:

- **Correct**: your answer equals the stored answer, ignoring upper and lower case.
- **Close match**: it is not equal, but your answer contains a word from the stored answer that is longer than three letters.
- **Not correct**: neither of the above.

The verdict is feedback only. You still choose Again, Hard, Good or Easy yourself, and that choice is what schedules the card. Lemma does not trim punctuation or check spelling beyond the comparison above, so a long answer may read "Not correct" even when you were right. An empty answer is ignored.

## Image cards

When both sides of a card are a single image, the review window swaps the images in place instead of stacking them.

1. Read the question image. Press `Space` to see the answer image in the same position.
2. A line under the image says "Answer (tap to peek question)". Tap or click the image, or press `Space`, `Enter`, `P` or `F`, to flip back to the question. The line then says "Question (tap to see answer)".
3. Rate the card when you are ready.

## Whole-note review

**Review due notes** opens a separate window for notes tagged `#review`.

- A note is due if it has never been rated or its due date has passed.
- The window shows the note rendered without its frontmatter, and an **Open note in editor** button.
- Rate with the four buttons or with `1` to `4`. There is no "show answer" step and no interval hint.
- **Skip** moves on without rating. `Esc` closes the window.
- If nothing is due, Lemma shows "No notes due for review."

## Browsing a deck

The list icon on a deck row opens **Browse**, a read-only viewer that shows each card's front and back. Use the arrow buttons or the left and right arrow keys to move between cards, and `Esc` to close. Browsing does not rate cards or change their schedule.

## Card details during review

Clicking the window title shows a notice with the card's stability, difficulty, repetitions, lapses and due date, or "This is a new card." if it has no history. Both the notice and the pencil icon (**Edit this card**) refer to the card currently on screen.

## Leaving a session

Closing the window with `Esc` or the close button keeps every rating you gave. Cards you did not reach stay as they were. The dashboard refreshes when the window closes.
