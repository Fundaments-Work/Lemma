import { describe, it, expect, vi } from 'vitest';
import { createEmptyCard, Rating, State } from 'ts-fsrs';

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

import 'fake-indexeddb/auto';

vi.mock('obsidian', () => ({ Notice: class {}, TFile: class {} }));

import { DataManager } from '../src/data/DataManager';
import { PouchDBManager } from '../src/database/PouchDBManager';
import { PouchDBManager as ReleasedPouchDBManager } from './fixtures/PouchDBManager.v1.1.5';
import { DEFAULT_SETTINGS, LEGACY_DATABASE_NAME, resolveDatabaseName } from '../src/data/constants';

const CONTENT = [
    'Block question::Block answer ^abc123',
    'Hashed question::Hashed answer',
    'Fill the ==c1::gap== here ^cz9',
].join('\n');

function createManager(databaseName: string | undefined, path = 'Decks/Bio.md') {
    const file = { path, basename: 'Bio', extension: 'md', stat: { mtime: 1 } };
    const plugin = {
        app: {
            vault: { getMarkdownFiles: () => [file], read: async () => CONTENT },
            metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
        },
        settings: { ...DEFAULT_SETTINGS, usePouchDB: true, databaseName },
        loadData: async () => null,
        saveData: async () => undefined,
    };
    return new DataManager(plugin as never);
}

const settle = () => new Promise((r) => setTimeout(r, 200));

describe('data written by released version 1.1.5', () => {
    it('is fully loaded by the current version, with identical schedules and history', async () => {
        const seed = createManager(undefined);
        await seed.buildIndex();
        const cards = seed.getAllCards();
        expect(cards).toHaveLength(3);

        const released = new ReleasedPouchDBManager(LEGACY_DATABASE_NAME);
        const written = new Map<string, Date>();
        let t = Date.UTC(2026, 0, 1);
        for (const card of cards) {
            const fsrs = createEmptyCard(new Date(t));
            fsrs.state = State.Review;
            fsrs.stability = 12.5;
            fsrs.difficulty = 6.25;
            fsrs.reps = 4;
            fsrs.lapses = 1;
            fsrs.due = new Date(t + 14 * 86400000);
            fsrs.last_review = new Date(t);
            await released.saveCardState(card.id, card.deckId, card.filePath, fsrs);
            await released.addReviewLog(card.id, t, Rating.Good);
            written.set(card.id, fsrs.due);
            t += 1000;
        }
        await released.saveSettings({ deckTag: 'flashcards', newCardsPerDay: 20, reviewsPerDay: 200, fontSize: 18, fsrsParams: { request_retention: 0.9, maximum_interval: 36500, w: [1] } });
        await (released as unknown as { db: { close(): Promise<void> } }).db.close();

        const upgraded = createManager(LEGACY_DATABASE_NAME);
        await upgraded.load();
        const loaded = upgraded.getAllCards();
        expect(loaded).toHaveLength(3);
        for (const card of loaded) {
            expect(card.fsrsData?.stability).toBe(12.5);
            expect(card.fsrsData?.reps).toBe(4);
            expect(card.fsrsData?.due.getTime()).toBe(written.get(card.id)!.getTime());
        }
        expect(upgraded.getReviewHistory().map((l) => l.timestamp)).toEqual([...written.keys()].map((_, i) => Date.UTC(2026, 0, 1) + i * 1000));

        const settings = await upgraded.getPouchDB()!.getSettings();
        expect(settings?.newCardsPerDay).toBe(20);

        const card = loaded[0];
        upgraded.updateCard(card, Rating.Good);
        await settle();
        await upgraded.getPouchDB()!.close();

        const again = createManager(LEGACY_DATABASE_NAME);
        await again.load();
        const reloaded = again.getAllCards().find((c) => c.id === card.id)!;
        expect(reloaded.fsrsData?.reps).toBe(5);
        expect(again.getReviewHistory()).toHaveLength(4);
        await again.getPouchDB()!.close();
    });

    it('keeps the released database name for installs that already have saved data', () => {
        expect(resolveDatabaseName(undefined, true, 'vault-a')).toBe('lemma_local');
        expect(resolveDatabaseName('lemma_local', true, 'vault-a')).toBe('lemma_local');
        expect(resolveDatabaseName('custom', true, 'vault-a')).toBe('custom');
    });

    it('gives a brand-new vault its own database name, stable per vault', () => {
        const a = resolveDatabaseName(undefined, false, 'vault-a');
        const b = resolveDatabaseName(undefined, false, 'vault-b');
        expect(a).not.toBe('lemma_local');
        expect(a).toMatch(/^lemma_local_[0-9a-f]{16}$/);
        expect(a).not.toBe(b);
        expect(resolveDatabaseName(undefined, false, 'vault-a')).toBe(a);
    });

    it('does not let a scoped vault database see the shared database', async () => {
        const shared = new PouchDBManager(LEGACY_DATABASE_NAME);
        await shared.saveCardState('0123456789abcdef::x', 'd', 'a.md', createEmptyCard());
        const scoped = new PouchDBManager(resolveDatabaseName(undefined, false, 'vault-c'));
        expect(Object.keys(await scoped.getAllCardStates())).toEqual([]);
        expect(Object.keys(await shared.getAllCardStates())).toContain('0123456789abcdef::x');
        await shared.close();
        await scoped.close();
    });
});
