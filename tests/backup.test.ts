import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Rating, State } from 'ts-fsrs';

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

import 'fake-indexeddb/auto';

vi.mock('obsidian', () => ({ Notice: class {}, TFile: class {} }));

import { DataManager } from '../src/data/DataManager';
import { parseBackup } from '../src/data/backup';
import { DEFAULT_SETTINGS } from '../src/data/constants';

const CONTENT = 'First::One ^a1\nSecond::Two ^b2\n';
const settle = () => new Promise((r) => setTimeout(r, 200));

function create(usePouchDB: boolean, databaseName = 'backup_db') {
    const file = { path: 'Decks/B.md', basename: 'B', extension: 'md', stat: { mtime: 1 } };
    const plugin = {
        app: {
            vault: { getMarkdownFiles: () => [file], read: async () => CONTENT },
            metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
        },
        manifest: { version: '9.9.9' },
        settings: { ...DEFAULT_SETTINGS, gamification: { ...DEFAULT_SETTINGS.gamification }, usePouchDB, databaseName },
        loadData: async () => null,
        saveData: async () => undefined,
    };
    return new DataManager(plugin as never);
}

describe('backup format', () => {
    it('round-trips schedules, history and streak data exactly', async () => {
        const source = create(false);
        await source.buildIndex();
        const [a, b] = source.getAllCards();
        source.updateCard(a, Rating.Good);
        source.updateCard(b, Rating.Again);

        const text = source.exportBackup();
        expect(JSON.parse(text)).toMatchObject({ format: 'lemma-backup', version: 1, pluginVersion: '9.9.9' });

        const target = create(false);
        await target.buildIndex();
        const result = await target.importBackup(parseBackup(text));
        expect(result).toMatchObject({ cards: 2, matched: 2, reviews: 2, skipped: 0 });
        for (const card of target.getAllCards()) {
            const original = source.getAllCards().find((c) => c.id === card.id)!;
            expect(card.fsrsData).toEqual(original.fsrsData);
        }
        expect(target.getReviewHistory()).toEqual(source.getReviewHistory());
        expect(target.getGamificationStats().totalCardsReviewed).toBe(2);
    });

    it('never overwrites a more recently reviewed card and never duplicates reviews', async () => {
        const source = create(false);
        await source.buildIndex();
        const card = source.getAllCards()[0];
        source.updateCard(card, Rating.Good);
        const older = source.exportBackup();

        await new Promise((r) => setTimeout(r, 5));
        source.updateCard(card, Rating.Easy);
        const newestReps = card.fsrsData!.reps;

        const result = await source.importBackup(parseBackup(older));
        expect(result.cards).toBe(0);
        expect(result.reviews).toBe(0);
        expect(card.fsrsData!.reps).toBe(newestReps);
        expect(source.getReviewHistory()).toHaveLength(2);
    });

    it('rejects files that are not backups and skips corrupt entries', () => {
        expect(() => parseBackup('not json')).toThrow(/valid JSON/);
        expect(() => parseBackup('{"hello":1}')).toThrow(/not a Lemma backup/);
        expect(() => parseBackup('[]')).toThrow(/not a Lemma backup/);
        const parsed = parseBackup(JSON.stringify({
            cardData: {
                ok: { due: '2026-01-01T00:00:00Z', stability: 1, difficulty: 1, elapsed_days: 0, scheduled_days: 1, reps: 1, lapses: 0, state: 2 },
                badDate: { due: 'nope', stability: 1, difficulty: 1, elapsed_days: 0, scheduled_days: 1, reps: 1, lapses: 0, state: 2 },
                badNumber: { due: '2026-01-01', stability: 'x' },
                __proto__: { due: '2026-01-01' },
            },
            reviewHistory: [{ cardId: 'ok', timestamp: 1, rating: 3 }, { cardId: 'ok', timestamp: 2, rating: 99 }, null, 'x'],
        }));
        expect(Object.keys(parsed.cardData)).toEqual(['ok']);
        expect(parsed.reviewHistory).toHaveLength(1);
        expect(parsed.skipped).toBe(5);
    });

    it('reads the data.json written by older releases (data.example.json)', () => {
        const legacy = parseBackup(readFileSync('data.example.json', 'utf8'));
        expect(Object.keys(legacy.cardData)).toHaveLength(7);
        expect(legacy.reviewHistory).toHaveLength(6);
        expect(legacy.skipped).toBe(0);
        expect(Object.values(legacy.cardData).every((c) => c.due instanceof Date && c.state === State.Learning || c.state === State.Review)).toBe(true);
    });

    it('persists an import to PouchDB over existing documents and survives a restart', async () => {
        const first = create(true);
        await first.load();
        const [a, b] = first.getAllCards();
        first.updateCard(a, Rating.Good);
        await settle();
        const sourceText = (() => {
            const other = create(false);
            return other.buildIndex().then(() => {
                const [x, y] = other.getAllCards();
                other.updateCard(x, Rating.Easy);
                other.updateCard(y, Rating.Good);
                return other.exportBackup();
            });
        })();
        const result = await first.importBackup(parseBackup(await sourceText));
        expect(result.cards).toBeGreaterThanOrEqual(1);
        await settle();
        await first.getPouchDB()!.close();

        const second = create(true);
        await second.load();
        const reloaded = second.getAllCards();
        expect(reloaded.every((c) => c.fsrsData)).toBe(true);
        expect(reloaded.find((c) => c.id === b.id)?.fsrsData?.reps).toBe(1);
        expect(second.getReviewHistory().length).toBeGreaterThanOrEqual(3);
        await second.getPouchDB()!.close();
    });
});
