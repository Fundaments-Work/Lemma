# Sync and Data

See what Lemma stores in your notes, in Obsidian's local database and in data.json, and how to connect your own CouchDB server to share review data.

## What lives where

| Data | Where it is stored | Travels with |
|---|---|---|
| Cards (questions, answers, clozes) | Plain Markdown in your notes | Your vault: whatever syncs your notes |
| Deck membership | The deck tag in each note | Your vault |
| Card schedules (due date, stability, difficulty, counts) | Local browser database (PouchDB on IndexedDB) | CouchDB sync, if you enable it |
| Review history (one entry per rating) | Local browser database | CouchDB sync, if you enable it |
| Settings, streak and XP | `data.json` in the plugin folder | Your vault, if it syncs `.obsidian` |

Lemma never writes anything into your notes except the cards, block IDs and tags that you or its commands insert. It does not create separate files per card.

### The local database

With the default **Use PouchDB (IndexedDB)** setting, Lemma stores schedules and review history in a local database, inside the storage Obsidian provides for plugins. Each card is a document keyed by its card ID, and each rating is a separate review log document.

Obsidian gives all your vaults one shared browser storage, so a database name must be unique per vault. Installs made before this was handled keep the shared name `lemma_local` permanently, so no data is moved or renamed. A vault where Lemma is installed fresh gets its own database named `lemma_local_` plus an identifier for that vault, and Lemma stores the name in the plugin's `data.json` so it never changes. If you use several vaults that were set up with older versions, they still share `lemma_local`; schedules are matched by card ID, which includes the note path, so unrelated vaults do not interfere unless they contain notes at the same paths.

Lemma loads this data when Obsidian finishes starting, then indexes your notes. Ratings are written to the database right after you give them.

### The data.json file

`data.json` sits in `<vault>/.obsidian/plugins/lemma-flashcards/`. It holds your settings, including the CouchDB password if you entered one, and streak and XP totals. Obsidian does not encrypt this file. With **Use PouchDB** on, schedules and review history are not written to this file.

If you turn **Use PouchDB** off, Lemma keeps schedules and history in `data.json` only. This is the older storage mode. See [Migrating](migrating.md).

### Privacy

Lemma has no telemetry, analytics, ads or crash reporting. It makes network requests only to your CouchDB server, and only after you enable sync. Links to GitHub and the support page open in your browser only when you click them. Lemma lists Markdown notes only, so it can find tagged notes; it does not read attachments or other plugins' data.

## Set up CouchDB sync

Sync is optional and off by default. It uses CouchDB replication, so you need a CouchDB (or compatible, such as Cloudant) server that you run or rent. Lemma does not provide a server.

### Prepare the server

1. Create an empty database on your server, for example `lemma`.
2. Create a dedicated CouchDB user with access to that database only. Do not use an admin account.
3. Serve CouchDB over HTTPS. A plain `http://` address sends your password and review data unencrypted. Lemma warns you if the address is `http://` and not on your own computer.
4. Enable CORS on the server so that requests from Obsidian are accepted. If CORS is wrong, Lemma reports "Check cors settings and sync URL" and stops syncing.

### Connect Lemma

1. Open **Settings > Lemma > Sync**.
2. In **CouchDB server URL**, enter the server address, for example `https://example.com:5984`. You may include the database name in the URL.
3. In **Database name**, enter the database (default `lemma`). If the URL already ends with this name it is not added twice.
4. Enter **Username** and **Password**.
5. Click **Run test** under **Test sync**. A notice shows the number of local and remote documents.
6. Turn on **Enable sync**.

Lemma checks that the remote database can be reached, then starts live, two-way replication that retries after interruptions. A notice "Sync initialized successfully" confirms it. Sync also starts automatically each time Obsidian starts while the setting is on. Repeat the steps on each device, using the same server and database.

If enabling fails, Lemma shows the error and turns **Enable sync** back off.

### Using sync day to day

- Live sync runs in the background. When changes arrive, a notice such as "Synced 12 changes" appears.
- Click the cloud icon on the dashboard for a manual sync. It times out after 15 seconds. The icon appears only when sync is enabled.
- Run the **Sync now** command to restart sync, or **Check sync status** to see whether it is active, the server address with credentials removed, the number of documents and the last sync time.
- In **Settings > Lemma > Sync**, **Check status** shows the same information.

**Sync now** and **Check sync status** are registered when Obsidian starts and only if **Use PouchDB** is on. They are not in the palette otherwise.

### Sync stops on errors

Sync stops on its own when the server answers 401 (bad credentials), 403 (forbidden) or 404 (database missing), after five repeated connection errors, or when the error looks like a network or CORS problem. Fix the cause, then run **Sync now** or toggle **Enable sync** off and on.

### Security notes

- The password is saved in `data.json`, which is not encrypted. Use a CouchDB user that can reach only the sync database.
- Lemma keeps the full address with the password in memory and saves only the address without credentials in the synced `sync_meta` document. Versions before 1.1.4 stored the credentials there; 1.1.4 removed that and cleans old entries.
- The **Check sync status** notice and debug logs hide the username and password.

## What sync covers, and what it does not

Sync replicates card schedules and review history between devices that use the same database.

Sync does not cover:

- **Your notes.** Cards are text in your notes. Keep notes in step with Obsidian Sync or another tool you already use. A card that is not in a device's vault cannot be reviewed there.
- **Settings, streak and XP.** These stay in each device's `data.json`.
- **Conflict handling.** Lemma uses CouchDB's standard replication without its own merge logic. If you review the same card on two devices before they sync, CouchDB picks one version.

## Back up your data

Your cards are in your notes, so back up your vault as usual. Review progress lives in the local database, so also run **Export review data (backup)** now and then. It writes `Lemma backup <date and time>.json` to the vault root, containing schedules, review history and streak data, but no settings or passwords. **Import review data from backup** merges a backup into your data, and also accepts a `data.json` file from any Lemma version. A sync database on your own CouchDB server holds a replica as well.

## Resetting data

**Reset all card progress** deletes the local database and starts a new one. See [Settings](settings.md#reset-progress). If sync is on, reset every device, or other devices may replicate old data back to you.
