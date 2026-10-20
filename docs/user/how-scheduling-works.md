# How Scheduling Works

Lemma schedules every card with FSRS-5, which estimates how well you remember it and picks the next review date from your Again, Hard, Good or Easy rating.

## The idea behind FSRS

FSRS (Free Spaced Repetition Scheduler) models two things for every card:

- **Stability**: how long a memory lasts. A higher number means the memory fades more slowly.
- **Difficulty**: how hard the card is for you, on a scale from 1 to 10.

From these it estimates **retrievability**, the chance you can recall the card right now, which falls over time since your last review. When you rate a card, FSRS updates stability and difficulty and sets the next due date so that your expected recall on that date matches your target retention.

Lemma uses the `ts-fsrs` library for this. Parameters are the standard FSRS-5 set of 19 weights. You do not need to understand the weights to use Lemma; the defaults work for most people.

## What each rating does

- **Again**: the card counts as forgotten. It returns after a short step of minutes, its stability drops and its difficulty rises.
- **Hard**: you recalled it, but with effort. The next interval grows only a little.
- **Good**: the normal rating for a successful recall. The interval grows.
- **Easy**: the interval grows the most, and the card's difficulty falls.

Intervals depend on the card's history, so the same rating gives different dates for different cards. The interval hints on the rating buttons show the result for the card on screen.

## Learning steps for new cards

With the default settings Lemma uses FSRS short-term scheduling. A brand-new card rated Again, Hard or Good first goes through short steps measured in minutes; rated Easy it graduates straight to a multi-day interval. Lemma's settings screen does not expose learning or relearning steps. In the code the short-term option is on and the steps come from the `ts-fsrs` library version bundled with the plugin.

A card that is in a learning or relearning step is counted as "learning" in the dashboard and statistics.

## Which cards enter a queue

When you start a deck session or **Study all due**, Lemma builds a queue per deck:

1. **Due cards**: cards that already have a schedule and whose due time has passed, oldest first.
2. **New cards**: cards that have never been rated, in the order they appear.

The daily limits apply to each deck separately:

- **Max reviews per day** (default 200) caps due cards. The cap is reduced by the number of reviews you have already done today in that deck.
- **Max new cards per day** (default 20) caps the new cards added to the queue. The cap is reduced by the number of cards in that deck whose first-ever rating was today, so a second session on the same day continues where the first stopped instead of offering a fresh batch.

A card you rated Again, or a new card you rated Hard or Good, is in a short learning step. During a session it returns a few cards later if its step is due within 30 minutes, and it is offered again in any queue you build after its step is due, even the same day. Cards that graduated to a multi-day interval are not due until that day.

"Today" means since midnight on your device's clock.

Cram sessions and [custom study](custom-study.md) sessions do not use the daily limits.

## Retention and maximum interval

Two settings in **Settings > Lemma > Advanced** change how aggressive the schedule is.

- **Request retention** is the share of cards you want to remember when they come due. The default is 0.9, meaning 90 percent. Raising it shortens intervals and increases your daily workload. Lowering it lengthens intervals and you will forget more. The field accepts values greater than 0 and less than 1; its help text suggests 0.7 to 0.99.
- **Maximum interval** is the longest gap between reviews, in days. The default is 36500 (about 100 years).

Changing either setting affects future schedules only. Cards already scheduled keep their due dates until you review them.

## Weights and the optimizer

The weights are the numbers that describe how memory behaves in the FSRS formulas. The defaults come from research on many learners. Once you have enough history you can run the built-in optimizer to fit weights to your own reviews. See [Settings](settings.md#fsrs-weight-optimizer).

The optimizer is Lemma's own implementation, written in TypeScript. It is not the reference FSRS optimizer, so treat its results as an experiment and compare the reported loss before applying them.

## Fuzz

FSRS can add small random variation to intervals so cards do not bunch up. In Lemma this is off (`enable_fuzz` is false), and there is no setting for it.

## Whole notes

Notes tagged `#review` use the same FSRS scheduling. A note's state is stored under the key `note::<path>` and each rating is added to the review history like a card rating.

## Where your schedule is stored

Each card's stability, difficulty, due date and counts are saved after every rating, together with a log of the rating. See [Sync and data](sync-and-data.md).
