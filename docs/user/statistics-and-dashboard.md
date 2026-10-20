# Statistics and Dashboard

Read the Lemma dashboard counts, streak and XP, and the Statistics window charts for retention, card maturity, intervals, daily activity and decks.

## The dashboard

The dashboard opens from the ribbon icon, the status bar button or the **Open dashboard** command. It is titled "Lemma decks" and opens in the main workspace area.

### Header buttons

| Button | What it does |
|---|---|
| **Study all due** | Starts one session across all decks. A badge shows the total due count when it is above zero |
| **New deck** | Opens the guided deck creator |
| **New card** | Opens the guided card creator |
| **Statistics** | Opens the Statistics window |
| **Custom study** | Opens the [custom study](custom-study.md) form |
| Help icon | Opens the in-app **Help & guide** window |
| Refresh icon | Rebuilds the deck index from your notes |
| Cloud icon | Runs a manual sync. Shown only when sync is enabled |

### Counts

Three counts summarize all decks:

- **total**: every card in every deck.
- **due**: cards with a schedule whose due time has passed.
- **new**: cards that have never been rated.

A card is counted as due when its due time has passed. The deck queue also applies your daily limits, so it can hold fewer cards than the due count. See [How scheduling works](how-scheduling-works.md#which-cards-enter-a-queue).

### Streak and XP

Below the counts the dashboard shows three values:

- **day streak**: consecutive days on which you reviewed at least one card.
- **XP**: points earned per rating. Each rating earns `10 x rating multiplier x interval factor`, rounded, where the multiplier is 1 for Again, 2 for Hard, 3 for Good and 4 for Easy, and the interval factor is the new interval in days divided by 7, kept between a minimum of 1/7 and a maximum of 3.
- **best streak**: your longest streak so far.

Streak and XP are kept in the plugin's settings data, not in the review database, so they do not sync through CouchDB. Whole-note ratings do not add XP or streak.

### Deck list

Decks are grouped by folder. Each deck row shows its due count and new count, and three icons: play (study the deck's queue), lightning (cram all cards) and list (browse). See [Organizing decks](organizing-decks.md#folders-on-the-dashboard).

![The Lemma dashboard on a phone with Study all due, Statistics and Custom study buttons and a list of decks with play, cram and browse icons](../screenshots/lemma_mobile_dashboard.jpg)

## The Statistics window

Click **Statistics** on the dashboard. The window scrolls. From top to bottom it contains the following.

### Summary tiles

- **Reviews today**: ratings given since midnight, including whole-note ratings.
- **Due this week**: cards due in the next seven days, today included. It is the sum of the bars in the 7-day forecast.
- **Mature cards**: cards whose stability is 21 days or more.
- **Total learned**: mature cards plus young cards.

### Retention rate

A line chart over up to the last 60 days on which you reviewed. For each day it plots:

- **Predicted**: the average recall probability FSRS expected for the cards you reviewed that day.
- **Actual**: the share of those reviews you rated Good or Easy.

If Actual stays well below Predicted, your real recall is lower than the model assumes. Consider the optimizer or a higher retention target; see [Settings](settings.md#advanced-tab). The chart replays your whole rating history with your current weights, so it can be slow on very large histories.

### Card maturity

A doughnut chart of all cards:

- **New**: never rated.
- **Learning**: rated but not yet in the long-term review state, and stability under 21 days.
- **Young**: in the review state with stability under 21 days.
- **Mature**: stability of 21 days or more.

### Review intervals

A bar chart of how long you waited between consecutive reviews of the same card, in buckets from `<1d` up to `>30d`. It is based on actual review dates, not scheduled dates. It stays empty until a card has been reviewed at least twice.

### 12-month activity

A heatmap with one square per day for the last 365 days. Darker squares mean more reviews relative to your busiest day. Hover a square to see the date and review count.

### Per-deck breakdown

A stacked bar chart of **New**, **Learning** and **Due** cards for each deck. It shows up to 15 decks, ordered by workload; any further decks are combined into one **Other** bar.

### 30-day activity

A line chart of reviews per day for the last 30 days.

### 7-day forecast

A bar chart of the cards due on each of the next seven days, starting with today. The first bar also includes cards that are already overdue. Cards due later than seven days from today are not shown. Cards that have never been rated have no due date and are not counted.

![The Statistics window on a phone with four summary tiles, a 30-day activity chart and a 7-day forecast chart](../screenshots/lemma_mobile_stats.jpg)

## Resetting statistics

Statistics are computed from your review history. They reset only if you reset progress; see [Settings](settings.md#reset-progress).
