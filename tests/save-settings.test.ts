import { describe, it, expect, vi } from 'vitest';
import { Rating } from 'ts-fsrs';

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

vi.mock('obsidian', () => {
    const stub = class {};
    return {
        addIcon: () => {}, ButtonComponent: stub, Component: stub, debounce: (fn: unknown) => fn,
        ItemView: stub, MarkdownRenderer: stub, Modal: stub, Notice: stub, Plugin: stub,
        PluginSettingTab: stub, setIcon: () => {}, Setting: stub, TFile: stub,
    };
});
vi.mock('../src/database/PouchDBManager', () => ({
    PouchDBManager: class {
        async saveCardState() {}
        async addReviewLog() {}
    },
}));

import { FSRSFlashcardsPlugin } from '../src/plugin/main';
import { DataManager } from '../src/data/DataManager';
import { DEFAULT_SETTINGS } from '../src/data/constants';

async function savedPayload(usePouchDB: boolean) {
    const saveData = vi.fn().mockResolvedValue(undefined);
    const plugin = {
        app: {
            vault: { getMarkdownFiles: () => [], read: async () => '' },
            metadataCache: { getFileCache: () => null },
        },
        settings: { ...DEFAULT_SETTINGS, usePouchDB },
        saveData,
        loadData: async () => null,
        dataManager: undefined as unknown as DataManager,
    };
    plugin.dataManager = new DataManager(plugin as never);
    plugin.dataManager.updateCard({
        id: 'deck::card', deckId: 'deck', filePath: 'a.md', type: 'basic', originalText: '', front: 'f', back: 'b',
    }, Rating.Good);
    saveData.mockClear();

    await FSRSFlashcardsPlugin.prototype.saveSettings.call(plugin as never);
    return saveData.mock.calls.at(-1)![0] as { settings: { usePouchDB: boolean }; cardData: object; reviewHistory: unknown[] };
}

describe('saveSettings', () => {
    it('does not write card data or review history to data.json in PouchDB mode', async () => {
        const payload = await savedPayload(true);
        expect(payload.cardData).toEqual({});
        expect(payload.reviewHistory).toEqual([]);
        expect(payload.settings.usePouchDB).toBe(true);
    });

    it('keeps card data and review history in data.json in legacy JSON mode', async () => {
        const payload = await savedPayload(false);
        expect(Object.keys(payload.cardData)).toEqual(['deck::card']);
        expect(payload.reviewHistory).toHaveLength(1);
    });
});
