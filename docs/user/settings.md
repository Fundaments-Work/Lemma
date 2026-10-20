# Settings

Every Lemma setting in Obsidian, grouped by its General, Sync, Advanced and About tabs, with defaults, valid values and the FSRS weight optimizer.

Open **Settings > Community plugins > Lemma** (or **Settings > Lemma**). The page has four tabs along the top: **General**, **Sync**, **Advanced** and **About**. Changes save as you type or toggle; there is no Save button.

## General tab

### Database

| Setting | Default | What it does |
|---|---|---|
| **Use PouchDB (IndexedDB)** | On | Stores review data in the browser database that Obsidian provides instead of in `data.json`. Turning it off or on shows a notice asking you to reload Obsidian. |
| **Migrate to PouchDB** | Button: **Migrate now** | Copies review data from `data.json` into the local database. Needs PouchDB on. See [Migrating](migrating.md) |

The sync commands and sync features exist only while PouchDB is on. Reload Obsidian after changing this toggle.

### Deck tag

| Setting | Default | What it does |
|---|---|---|
| **Deck tag** | `flashcards` | The tag that marks a note as a deck. Enter it without `#`. Changing it re-scans the vault immediately |

See [Organizing decks](organizing-decks.md#changing-the-deck-tag).

### Global review defaults

| Setting | Default | What it does |
|---|---|---|
| **Max new cards per day** | 20 | New cards added to each deck's queue. Whole numbers of 0 or more |
| **Max reviews per day** | 200 | Cap on due cards per deck per day. Whole numbers of 0 or more |

Both apply to all decks; there are no per-deck overrides. Invalid entries such as letters are ignored and the old value stays. Details of how the limits behave are in [How scheduling works](how-scheduling-works.md#which-cards-enter-a-queue).

### Appearance

| Setting | Default | What it does |
|---|---|---|
| **Review font size** | 18 | Slider from 12 to 32 pixels for card text in the review and browse windows |

### Reset all card progress

The **Reset progress** button opens a confirmation window. See [Reset progress](#reset-progress) below.

## Sync tab

All sync settings are for an optional CouchDB server. Nothing is sent anywhere unless **Enable sync** is on. See [Sync and data](sync-and-data.md) for the full setup.

| Setting | Default | What it does |
|---|---|---|
| **Enable sync** | Off | Starts or stops live sync with your server. Turning it on needs a URL, username and password |
| **CouchDB server URL** | empty | For example `https://example.com:5984/db` |
| **Database name** | `lemma` | Added to the URL path if the URL does not already end with it. Leaving it empty restores `lemma` |
| **Username** | empty | CouchDB user name |
| **Password** | empty | Stored in the plugin's `data.json` file in your vault, not encrypted |
| **Test sync** | Button: **Run test** | Checks the connection and shows local and remote document counts. If sync is enabled it also runs a one-time sync |
| **Sync status** | Button: **Check status** | Shows whether sync is active, the document count and the last sync time. Visible only when sync is enabled |

Entering an `http://` address that is not on this computer (`localhost`, `127.0.0.1`, `[::1]`) triggers a warning that credentials and review data would be sent unencrypted.

## Advanced tab

### FSRS parameters

These control the scheduling algorithm. The tab warns you to change them only if you know what you are doing.

| Setting | Default | What it does |
|---|---|---|
| **Reset FSRS parameters** | Button: **Reset** | Restores the FSRS defaults for retention, maximum interval and weights |
| **Request retention** | 0.9 | Target recall when a card comes due. Accepts numbers above 0 and below 1 |
| **Maximum interval** | 36500 | Longest interval in days. Whole numbers above 0 |
| **FSRS weights** | FSRS-5 defaults | Comma-separated list. Accepts exactly 19 numbers (a list of 17 is also accepted by the check) |

A value that fails these checks is silently ignored, and the previous value stays active. The meaning of each setting is in [How scheduling works](how-scheduling-works.md#retention-and-maximum-interval).

### FSRS weight optimizer

Under **Optimization**, **Optimize FSRS weights** has a **Run optimizer** button that opens the **FSRS weight optimizer** window.

1. The window shows how many reviews and cards it will use, and your current weights.
2. You need at least 5 cards with review history; otherwise **Run optimization** is disabled.
3. Click **Run optimization**. It runs 30 generations of 20 candidate weight sets and reports progress as "Epoch n/30" with a loss value. This typically takes a few seconds.
4. When it finishes, the window lists the optimized weights and compares the loss of your current weights against the optimized ones, with a percentage improvement.
5. Click **Apply weights** to save them, or **Discard** to keep your current weights.

The optimizer is an evolutionary search implemented inside Lemma, not the reference FSRS optimizer. It uses your current retention and maximum interval. Applying weights changes how future reviews are scheduled and how the retention chart is computed.

## About tab

The About tab shows the plugin version, and these buttons:

- **Buy me a momo** opens the support page in your browser.
- **Open guide** opens the in-app **Help & guide** window.
- **Open repository** opens the GitHub page.
- **View license** opens the MIT license text on GitHub.

Below them are two cheat sheets, **Quick card cheatsheet** and **Review shortcuts**.

## Reset progress

Reset progress is available from the General tab and from the command palette (**Reset all card progress (nuclear option)**). It cannot be undone.

1. Open the reset window. It shows how many cards you have and how many have progress.
2. Type `delete` in the confirmation field.
3. Click **Delete all progress**.

Lemma then clears every card's schedule and all review history, so every card becomes new. With PouchDB on it deletes the local database and creates a fresh one; if sync is enabled it reconnects afterwards. Gamification totals (streak and XP) are not cleared by this reset. Your notes are not changed.

If sync is on, other devices still hold their copies of the old data and may send it back. Reset on every device, or turn sync off first.

## Settings that live elsewhere

- Hotkeys for Lemma commands are set in **Settings > Hotkeys**. Lemma assigns none by default.
- Plugin updates, enabling and disabling are managed in **Settings > Community plugins**.
