# FSRS Spaced Repetition in Obsidian

FSRS is an open spaced repetition algorithm; Lemma uses FSRS-5 to schedule Obsidian flashcards from your ratings, with adjustable retention and an optimizer.

## What is FSRS?

FSRS stands for Free Spaced Repetition Scheduler. It is developed by the [open-spaced-repetition](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) project. Its README describes it as "a spaced repetition algorithm based on DSR model", a model that "considers three variables that affect memory: difficulty, stability, and retrievability."

In plain terms, for each card FSRS tracks how hard the card is for you (difficulty), how long the memory lasts (stability), and the chance you can recall it right now (retrievability). After each rating it updates these and picks the next date. The README also says FSRS "will adapt to the user's memory." For the longer explanation in Lemma's terms, see [How scheduling works](how-scheduling-works.md).

## How is FSRS different from SM-2 style schedulers?

The open-spaced-repetition [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS) says FSRS aims to schedule reviews more efficiently than SM-2, and that you choose a desired retention value. It also states: "With FSRS, users have to do 20-30% fewer reviews than with SM-2 algorithm to achieve the same retention level," and adds that "the figure is based on simulation results." That is the project's claim, not a measurement of Lemma, and your results will depend on your cards and habits.

A practical way to see the difference is what each scheduler stores. The documentation of the SM-2 style Obsidian Spaced Repetition plugin shows an interval and an ease value kept per card, in fields such as `sr-interval` and `sr-ease` ([data storage](https://www.stephenmwangi.com/obsidian-spaced-repetition/data-storage/)). FSRS instead stores stability and difficulty and works from a target retention, so you set how much you want to remember and it derives the intervals.

## What does Lemma use?

Lemma uses FSRS-5 with the standard 19 default weights, through the open source [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) library, a "TypeScript toolkit for building spaced repetition systems with FSRS." Lemma bundles ts-fsrs 4.7.1. The ts-fsrs README says the library version and the FSRS model version are independent, and that its current default is FSRS-7. The defaults of the bundled version are the 19-weight FSRS-5 set, which Lemma saves in its settings and passes to the scheduler.

Lemma turns FSRS short-term scheduling on and fuzz off, with no setting for either. See [How scheduling works](how-scheduling-works.md).

## Do I need to understand FSRS to use Lemma?

No. You rate each card Again, Hard, Good or Easy, and Lemma does the rest. The defaults (request retention 0.9, maximum interval 36500 days, the default weights) are applied until you change them. The Again, Hard, Good and Easy buttons show the interval each would give, which is enough to use the plugin. You can read the rest of this page later if you want to tune it.

## What can I tune?

All of these are in **Settings > Lemma > Advanced**. See [Settings](settings.md) for exact values and validation.

- **Request retention** (default 0.9): the share of cards you want to remember when they come due. Higher values give shorter intervals and more daily reviews. The ABC of FSRS says: "Higher retention leads to more reviews per day." Lemma accepts values above 0 and below 1.
- **Maximum interval** (default 36500 days): the longest gap between reviews.
- **FSRS weights** (19 numbers): the parameters of the model. The ABC of FSRS advises that users should not tweak parameters manually, so prefer the optimizer to hand editing.
- **Reset**: restores the defaults for all three.

Changes affect future schedules only; cards you already scheduled keep their due dates until you next review them.

## What does the optimizer do?

The optimizer fits weights to your own review history. In Lemma, **Run optimizer** needs at least 5 cards with history, searches for weights with an evolutionary method over 30 generations, and shows the loss of your current weights next to the optimized ones. You choose **Apply weights** or **Discard**.

Lemma's optimizer is its own TypeScript implementation. It is not the reference FSRS optimizer, which the open-spaced-repetition project provides in other packages such as `fsrs-optimizer` and `fsrs-rs`. Treat Lemma's result as an experiment and compare the reported loss before applying it. The ABC of FSRS says the default parameters are used when you "don't have enough reviews yet", so with a small history the defaults are a reasonable place to stay.

## Where next?

- [How scheduling works](how-scheduling-works.md) for ratings, learning steps, queues and daily limits.
- [Settings](settings.md#fsrs-weight-optimizer) for the optimizer window.
- [Lemma compared with other Obsidian flashcard plugins](compared-with-other-plugins.md) if you are choosing a plugin.
- [Getting started](getting-started.md) to install Lemma and run a first review.

## Sources

Last checked: October 2026.

- [Free Spaced Repetition Scheduler README](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler): what FSRS is, the difficulty, stability and retrievability model, the list of optimizer packages.
- [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS): the SM-2 comparison and its stated 20-30 percent figure with the simulation caveat, desired retention, advice on parameters and defaults.
- [ts-fsrs README](https://github.com/open-spaced-repetition/ts-fsrs): description of the library, model version independence, current default of FSRS-7.
- [Obsidian Spaced Repetition data storage documentation](https://www.stephenmwangi.com/obsidian-spaced-repetition/data-storage/): interval and ease fields as an example of SM-2 style data.
- Lemma facts: Lemma's source code and `THIRD_PARTY_NOTICES.md` (ts-fsrs 4.7.1, 19 default weights, retention 0.9, maximum interval 36500, short-term on, fuzz off).
