import { describe, it, expect, vi } from 'vitest';
import { Rating, State } from 'ts-fsrs';

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

import 'fake-indexeddb/auto';

vi.mock('obsidian', () => ({ Notice: class {}, TFile: class {} }));

import { DataManager } from '../src/data/DataManager';
import { DEFAULT_SETTINGS } from '../src/data/constants';

const CONTENT = 'First::One\nSecond::Two\n';
const settle = () => new Promise((r) => setTimeout(r, 200));

function create(usePouchDB: boolean, databaseName: string) {
    const file = { path: 'Decks/U.md', basename: 'U', extension: 'md', stat: { mtime: 1 } };
    const plugin = {
        app: {
            vault: { getMarkdownFiles: () => [file], read: async () => CONTENT },
            metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
        },
        settings: { ...DEFAULT_SETTINGS, gamification: { ...DEFAULT_SETTINGS.gamification }, usePouchDB, databaseName },
        loadData: async () => null,
        saveData: async () => undefined,
    };
    return { dm: new DataManager(plugin as never), plugin };
}

describe('undo last rating', () => {
    it('restores a never-rated card, its history and the streak counters', async () => {
        const { dm, plugin } = create(false, 'x');
        await dm.buildIndex();
        const card = dm.getAllCards()[0];
        expect(dm.canUndo()).toBe(false);

        dm.updateCard(card, Rating.Good);
        expect(card.fsrsData).toBeDefined();
        expect(plugin.settings.gamification.totalCardsReviewed).toBe(1);

        expect(dm.undoLastRating()).toBe(card);
        expect(card.fsrsData).toBeUndefined();
        expect(dm.getReviewHistory()).toHaveLength(0);
        expect(plugin.settings.gamification.totalCardsReviewed).toBe(0);
        expect(plugin.settings.gamification.totalXp).toBe(0);
        expect(dm.getStats().reviewsToday).toBe(0);
        expect(dm.canUndo()).toBe(false);
    });

    it('restores the previous schedule when undoing a second rating, most recent first', async () => {
        const { dm } = create(false, 'x');
        await dm.buildIndex();
        const card = dm.getAllCards()[0];
        dm.updateCard(card, Rating.Good);
        const afterFirst = { ...card.fsrsData! };
        dm.updateCard(card, Rating.Again);
        expect(card.fsrsData!.lapses).toBeGreaterThanOrEqual(0);

        dm.undoLastRating();
        expect(card.fsrsData).toEqual(afterFirst);
        expect(dm.getReviewHistory()).toHaveLength(1);
        dm.undoLastRating();
        expect(card.fsrsData).toBeUndefined();
        expect(dm.getReviewHistory()).toHaveLength(0);
    });

    it('is durable in PouchDB: after a restart the undone rating is gone', async () => {
        const first = create(true, 'undo_db');
        await first.dm.load();
        const [a, b] = first.dm.getAllCards();
        first.dm.updateCard(a, Rating.Good);
        first.dm.updateCard(b, Rating.Easy);
        await settle();
        first.dm.undoLastRating();
        await settle();
        await first.dm.getPouchDB()!.close();

        const second = create(true, 'undo_db');
        await second.dm.load();
        const cards = second.dm.getAllCards();
        const rated = cards.filter((c) => c.fsrsData && c.fsrsData.state !== State.New);
        expect(rated.map((c) => c.id)).toEqual([a.id]);
        expect(second.dm.getReviewHistory()).toHaveLength(1);
        await second.dm.getPouchDB()!.close();
    });
});
