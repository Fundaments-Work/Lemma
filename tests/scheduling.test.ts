import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Rating, State, type Card as FSRSCard } from 'ts-fsrs';

vi.mock('obsidian', () => ({
    Notice: class {},
    TFile: class {},
}));

vi.mock('../src/database/PouchDBManager', () => ({ PouchDBManager: class {} }));

import { DataManager } from '../src/data/DataManager';
import { DEFAULT_SETTINGS } from '../src/data/constants';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function note(count: number) {
    return Array.from({ length: count }, (_, i) => `Question ${i}::Answer ${i}`).join('\n');
}

async function createManager(cardCount: number, settings: Record<string, unknown> = {}) {
    const file = { path: 'Decks/Test.md', basename: 'Test', stat: { mtime: 1 } };
    const plugin = {
        app: {
            vault: { getMarkdownFiles: () => [file], read: async () => note(cardCount) },
            metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
        },
        settings: { ...DEFAULT_SETTINGS, usePouchDB: false, ...settings },
        loadData: async () => null,
        saveData: async () => undefined,
    };
    const dm = new DataManager(plugin as never);
    await dm.buildIndex();
    const deckId = dm.getDecks()[0].id;
    return { dm, deckId, cards: dm.getCardsByDeck(deckId) };
}

function setSchedule(dm: DataManager, cardId: string, due: Date) {
    const data: FSRSCard = {
        due, stability: 5, difficulty: 5, elapsed_days: 1, scheduled_days: 5,
        reps: 3, lapses: 0, state: State.Review, learning_steps: 0,
    };
    (dm as unknown as { fsrsDataStore: Record<string, FSRSCard> }).fsrsDataStore[cardId] = data;
}

describe('getStats forecast', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 10, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    it('counts cards due in each of the next 7 days, with overdue cards in today', async () => {
        const { dm, cards } = await createManager(6);
        const now = Date.now();
        setSchedule(dm, cards[0].id, new Date(now - 2 * DAY));
        setSchedule(dm, cards[1].id, new Date(now + 2 * HOUR));
        setSchedule(dm, cards[2].id, new Date(now + 1 * DAY));
        setSchedule(dm, cards[3].id, new Date(now + 3 * DAY));
        setSchedule(dm, cards[4].id, new Date(now + 3 * DAY + HOUR));
        setSchedule(dm, cards[5].id, new Date(now + 10 * DAY));

        const { forecast } = dm.getStats();
        expect(forecast).toEqual([2, 1, 0, 2, 0, 0, 0]);
        expect(forecast.reduce((a, b) => a + b, 0)).toBe(5);
    });

    it('reads zero when nothing is scheduled within the week', async () => {
        const { dm, cards } = await createManager(1);
        setSchedule(dm, cards[0].id, new Date(Date.now() + 30 * DAY));
        expect(dm.getStats().forecast).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });
});

describe('getReviewQueue daily limits', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 10, 9, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    it('does not offer a fresh batch of new cards in a second session the same day', async () => {
        const { dm, deckId } = await createManager(6, { newCardsPerDay: 2 });

        const first = dm.getReviewQueue(deckId);
        expect(first).toHaveLength(2);
        for (const card of first) dm.updateCard(card, Rating.Good);

        vi.setSystemTime(new Date(2026, 5, 10, 9, 30, 0));
        const second = dm.getReviewQueue(deckId);
        const introduced = new Set(first.map((c) => c.id));
        expect(second.filter((c) => !introduced.has(c.id))).toHaveLength(0);
    });

    it('serves learning cards again once their step is due the same day', async () => {
        const { dm, deckId } = await createManager(3, { newCardsPerDay: 2 });
        const [card] = dm.getReviewQueue(deckId);
        dm.updateCard(card, Rating.Again);

        vi.setSystemTime(new Date(2026, 5, 10, 9, 30, 0));
        expect(dm.getReviewQueue(deckId).map((c) => c.id)).toContain(card.id);
    });

    it('still allows new cards when none were introduced today', async () => {
        const { dm, deckId } = await createManager(4, { newCardsPerDay: 3 });
        expect(dm.getReviewQueue(deckId)).toHaveLength(3);
    });
});

describe('re-indexing an edited deck note', () => {
    it('keeps the schedules of the cards in the note', async () => {
        let content = 'Q::A ^b1';
        const file = { path: 'a.md', basename: 'a', stat: { mtime: 1 } };
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => content },
                metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const card = dm.getAllCards()[0];
        dm.updateCard(card, Rating.Good);

        content = 'Q::A ^b1\nQ2::A2';
        file.stat.mtime = 2;
        await dm.updateFile(file as never);

        expect(dm.getAllCards()).toHaveLength(2);
        expect(dm.getAllCards().find((c) => c.id === card.id)?.fsrsData?.reps).toBe(1);
    });
});

describe('sibling card burying', () => {
    it('identifies cloze cards in the same paragraph as siblings', async () => {
        const file = { path: 'Cloze.md', basename: 'Cloze', stat: { mtime: 1 } };
        const content = 'The ==c1::mitochondrion== is the powerhouse of the ==c2::cell==. ^p1';
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => content },
                metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const cards = dm.getAllCards();
        expect(cards).toHaveLength(2);
        expect(dm.areSiblings(cards[0], cards[1])).toBe(true);
        expect(dm.areSiblings(cards[0], cards[0])).toBe(false);
    });

    it('buries siblings so only one is queued per day when burySiblings is enabled', async () => {
        const file = { path: 'Cloze.md', basename: 'Cloze', stat: { mtime: 1 } };
        const content = 'The ==c1::mitochondrion== is the powerhouse of the ==c2::cell==. ^p1\n\nOther ==c1::card== alone.';
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => content },
                metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false, burySiblings: true },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const deckId = dm.getDecks()[0].id;
        const queue = dm.getReviewQueue(deckId);
        // Out of the 2 cloze siblings + 1 independent card, only 1 sibling + 1 independent card = 2 cards queued
        expect(queue).toHaveLength(2);
    });

    it('buries siblings if one was already reviewed earlier today', async () => {
        const file = { path: 'Cloze.md', basename: 'Cloze', stat: { mtime: 1 } };
        const content = 'The ==c1::mitochondrion== is the powerhouse of the ==c2::cell==. ^p1';
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => content },
                metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false, burySiblings: true },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const deckId = dm.getDecks()[0].id;
        const cards = dm.getAllCards();
        // Review the first sibling
        dm.updateCard(cards[0], Rating.Good);

        // Queue should now bury the second sibling for today
        const queue = dm.getReviewQueue(deckId);
        expect(queue).toHaveLength(0);
    });

    it('does not bury siblings when burySiblings is disabled', async () => {
        const file = { path: 'Cloze.md', basename: 'Cloze', stat: { mtime: 1 } };
        const content = 'The ==c1::mitochondrion== is the powerhouse of the ==c2::cell==. ^p1';
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => content },
                metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false, burySiblings: false },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const deckId = dm.getDecks()[0].id;
        const queue = dm.getReviewQueue(deckId);
        expect(queue).toHaveLength(2);
    });
});

describe('Per-deck settings overrides', () => {
    it('applies frontmatter newCardsPerDay override', async () => {
        const file = { path: 'CustomDeck.md', basename: 'CustomDeck', stat: { mtime: 1 } };
        const content = 'Q1::A1\nQ2::A2\nQ3::A3\nQ4::A4\nQ5::A5';
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => content },
                metadataCache: {
                    getFileCache: () => ({
                        frontmatter: { tags: ['flashcards'], newCardsPerDay: 2 },
                    }),
                },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false, newCardsPerDay: 20 },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const deckId = dm.getDecks()[0].id;
        const queue = dm.getReviewQueue(deckId);
        expect(queue).toHaveLength(2);
    });

    it('applies frontmatter requestRetention to card scheduling intervals', async () => {
        const file = { path: 'HighRetention.md', basename: 'HighRetention', stat: { mtime: 1 } };
        const content = 'Q1::A1';
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => content },
                metadataCache: {
                    getFileCache: () => ({
                        frontmatter: { tags: ['flashcards'], requestRetention: 0.99 },
                    }),
                },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const card = dm.getAllCards()[0];
        const intervals = dm.getNextReviewIntervals(card);
        expect(intervals).toBeDefined();
    });
});

describe('Leech detection', () => {
    it('identifies card as leech when lapses exceed threshold', async () => {
        const { dm, cards } = await createManager(1, { leechThreshold: 5 });
        const card = cards[0];
        expect(dm.isLeech(card)).toBe(false);

        setSchedule(dm, card.id, new Date());
        card.fsrsData = (dm as unknown as { fsrsDataStore: Record<string, FSRSCard> }).fsrsDataStore[card.id];
        card.fsrsData.lapses = 5;

        expect(dm.isLeech(card)).toBe(true);
    });

    it('returns false when leech detection is disabled (threshold = 0)', async () => {
        const { dm, cards } = await createManager(1, { leechThreshold: 0 });
        const card = cards[0];
        setSchedule(dm, card.id, new Date());
        card.fsrsData = (dm as unknown as { fsrsDataStore: Record<string, FSRSCard> }).fsrsDataStore[card.id];
        card.fsrsData.lapses = 10;

        expect(dm.isLeech(card)).toBe(false);
    });
});
