import { describe, it, expect, vi } from 'vitest';
import { Rating, State } from 'ts-fsrs';

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

import 'fake-indexeddb/auto';

vi.mock('obsidian', () => ({
    Notice: class {},
    TFile: class {},
}));

import { DataManager } from '../src/data/DataManager';
import { DEFAULT_SETTINGS } from '../src/data/constants';

const CONTENT = [
    'Block question::Block answer ^abc123',
    'Hashed question::Hashed answer',
    '',
    'The ==c1::mitochondria== is the powerhouse ^cloze1',
].join('\n');

function createManager(path: string, usePouchDB: boolean) {
    const file = { path, basename: 'Deck', extension: 'md', stat: { mtime: 1 } };
    let saved: unknown = null;
    const plugin = {
        app: {
            vault: { getMarkdownFiles: () => [file], read: async () => CONTENT },
            metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
        },
        settings: { ...DEFAULT_SETTINGS, usePouchDB },
        loadData: async () => saved,
        saveData: async (data: unknown) => { saved = data; },
    };
    return { file, plugin, dm: new DataManager(plugin as never) };
}

describe('renaming or moving a deck note', () => {
    it('keeps schedules and review history attached to the cards', async () => {
        const { file, dm } = createManager('Old/Deck.md', false);
        await dm.buildIndex();
        const before = dm.getAllCards();
        expect(before).toHaveLength(3);
        for (const card of before) dm.updateCard(card, Rating.Good);

        const oldPath = file.path;
        file.path = 'New/Renamed.md';
        await dm.renameDeck(file as never, oldPath);

        const after = dm.getAllCards();
        expect(after).toHaveLength(3);
        for (const card of after) {
            expect(card.filePath).toBe('New/Renamed.md');
            expect(card.fsrsData).toBeDefined();
            expect(card.fsrsData!.state).not.toBe(State.New);
            expect(card.fsrsData!.reps).toBe(1);
        }
        const ids = new Set(after.map((c) => c.id));
        expect(dm.getReviewHistory()).toHaveLength(3);
        expect(dm.getReviewHistory().every((log) => ids.has(log.cardId))).toBe(true);
        expect(dm.getDecks()[0].stats.new).toBe(0);
    });

    it('persists the re-keyed state in PouchDB across a restart', async () => {
        const first = createManager('Old/Deck.md', true);
        await first.dm.load();
        for (const card of first.dm.getAllCards()) {
            first.dm.updateCard(card, Rating.Good);
        }
        await new Promise((r) => setTimeout(r, 200));

        const oldPath = first.file.path;
        first.file.path = 'New/Renamed.md';
        await first.dm.renameDeck(first.file as never, oldPath);
        await new Promise((r) => setTimeout(r, 200));
        await first.dm.getPouchDB()!.close();

        const second = createManager('New/Renamed.md', true);
        await second.dm.load();
        const cards = second.dm.getAllCards();
        expect(cards).toHaveLength(3);
        for (const card of cards) {
            expect(card.fsrsData?.reps).toBe(1);
        }
        const ids = new Set(cards.map((c) => c.id));
        expect(second.dm.getReviewHistory()).toHaveLength(3);
        expect(second.dm.getReviewHistory().every((log) => ids.has(log.cardId))).toBe(true);
        await second.dm.getPouchDB()!.close();
    });

    it('keeps whole-note review state and drops the stale entry for the old path', async () => {
        const file = { path: 'Old/Note.md', basename: 'Note', extension: 'md', stat: { mtime: 1 } };
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => 'plain text' },
                metadataCache: { getFileCache: () => ({ tags: [{ tag: '#review' }] }) },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false },
            loadData: async () => null,
            saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        dm.rateNote('Old/Note.md', Rating.Good);

        file.path = 'New/Note.md';
        await dm.renameDeck(file as never, 'Old/Note.md');

        const notes = dm.getAllReviewNotes();
        expect(notes.map((n) => n.filePath)).toEqual(['New/Note.md']);
        expect(notes[0].fsrsData?.reps).toBe(1);
        expect(dm.getReviewHistory().map((l) => l.cardId)).toEqual(['note::New/Note.md']);
    });
});
