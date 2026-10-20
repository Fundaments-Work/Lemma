import { describe, it, expect, vi, afterEach } from 'vitest';

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

import 'fake-indexeddb/auto';
import { createEmptyCard, Rating } from 'ts-fsrs';

vi.mock('obsidian', () => ({
    Notice: class {},
    TFile: class {},
}));

import { DataManager } from '../src/data/DataManager';
import { PouchDBManager } from '../src/database/PouchDBManager';
import { DEFAULT_SETTINGS } from '../src/data/constants';

const NOTE = [
    'Block question::Block answer ^abc123',
    'Hashed question::Hashed answer',
].join('\n');

function indexNote(path: string, content: string, usePouchDB = false) {
    const file = { path, basename: 'deck', stat: { mtime: 1 } };
    const plugin = {
        app: {
            vault: { getMarkdownFiles: () => [file], read: async () => content },
            metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
        },
        settings: { ...DEFAULT_SETTINGS, usePouchDB },
        loadData: async () => null,
        saveData: async () => undefined,
    };
    const dm = new DataManager(plugin as never);
    return usePouchDB ? Promise.resolve(dm) : dm.buildIndex().then(() => dm);
}

let dbCounter = 0;
const opened: PouchDBManager[] = [];
function open(name: string) {
    const manager = new PouchDBManager(name);
    opened.push(manager);
    return manager;
}

afterEach(async () => {
    await Promise.all(opened.splice(0).map((m) => m.close()));
});

describe('PouchDB card state persistence', () => {
    it('reloads card schedules written under real generated card IDs after reopening the database', async () => {
        const dm = await indexNote('Decks/Biology.md', NOTE);
        const cardIds = dm.getAllCards().map((c) => c.id);
        expect(cardIds.length).toBeGreaterThanOrEqual(2);
        expect(cardIds.some((id) => id.includes('::'))).toBe(true);

        const name = `lemma_persist_${++dbCounter}`;
        const first = open(name);
        for (const id of cardIds) {
            const card = createEmptyCard(new Date('2026-01-01T00:00:00Z'));
            card.reps = 3;
            await first.saveCardState(id, 'deck', 'Decks/Biology.md', card);
        }
        await first.close();
        opened.splice(opened.indexOf(first), 1);

        const second = open(name);
        const loaded = await second.getAllCardStates();
        expect(Object.keys(loaded).sort()).toEqual([...cardIds].sort());
        expect(loaded[cardIds[0]].reps).toBe(3);
    });

    it('still loads documents stored under the legacy fsrs- prefix', async () => {
        const name = `lemma_persist_${++dbCounter}`;
        const db = open(name);
        await db.saveCardState('fsrs-legacy1', 'deck', 'a.md', createEmptyCard());
        await db.saveCardState('0123456789abcdef::fsrs-x1y2z3', 'deck', 'a.md', createEmptyCard());
        await db.addReviewLog('fsrs-legacy1', Date.now(), Rating.Good);

        const loaded = await db.getAllCardStates();
        expect(Object.keys(loaded).sort()).toEqual(['0123456789abcdef::fsrs-x1y2z3', 'fsrs-legacy1']);
    });

    it('reloads review history after reopening the database, newest first', async () => {
        const name = `lemma_persist_${++dbCounter}`;
        const first = open(name);
        await first.addReviewLog('0123456789abcdef::abc123', 1000, Rating.Good);
        await first.addReviewLog('0123456789abcdef::abc123', 3000, Rating.Again);
        await first.addReviewLog('fedcba9876543210', 2000, Rating.Easy);
        await first.close();
        opened.splice(opened.indexOf(first), 1);

        const second = open(name);
        const history = await second.getReviewHistory();
        expect(history.map((h) => h.timestamp)).toEqual([3000, 2000, 1000]);
        expect(await second.getReviewHistory(2)).toHaveLength(2);
    });

    it('loads review history into the data manager oldest first', async () => {
        const first = await indexNote('Decks/Order.md', NOTE, true);
        await first.load();
        const [a, b] = first.getAllCards();
        first.updateCard(a, Rating.Good);
        await new Promise((r) => setTimeout(r, 5));
        first.updateCard(b, Rating.Good);
        await new Promise((r) => setTimeout(r, 200));
        await first.getPouchDB()!.close();

        const second = await indexNote('Decks/Order.md', NOTE, true);
        await second.load();
        const stamps = second.getReviewHistory().map((l) => l.timestamp);
        expect(stamps).toHaveLength(2);
        expect(stamps[0]).toBeLessThan(stamps[1]);
        await second.getPouchDB()!.close();
    });
});
