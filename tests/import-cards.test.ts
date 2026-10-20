import { describe, it, expect } from 'vitest';
import { convertToLemma, parseDelimited } from '../src/data/importCards';

let n = 0;
const id = () => `fsrs-t${++n}`;

describe('card import', () => {
    it('converts a tab separated Anki plain text export', () => {
        const text = '#separator:tab\n#html:true\n#tags column:3\nCapital of France?\tParis\tgeo\nWhat is 2+2?<br>(easy)\t<b>4</b>&nbsp;units\tmath\n';
        const out = convertToLemma(text, 'flashcards', id);
        expect(out.cards).toBe(2);
        expect(out.markdown).toContain('tags: [flashcards]');
        expect(out.markdown).toContain('Capital of France?::Paris ^fsrs-t1');
        expect(out.markdown).toContain('---card--- ^fsrs-t2\nWhat is 2+2?\n(easy)\n---\n4 units');
    });

    it('converts Anki cloze notes and drops cloze hints', () => {
        const out = convertToLemma('The {{c1::mitochondria::organelle}} makes {{c2::ATP}}\n', 'flashcards', id);
        expect(out.markdown).toContain('The ==c1::mitochondria== makes ==c2::ATP== ^');
        expect(out.cards).toBe(1);
    });

    it('parses CSV with quotes, embedded commas, doubled quotes and newlines', () => {
        const csv = 'Front,Back\n"Say ""hi"", please","line one\nline two"\nplain,answer\n';
        expect(parseDelimited(csv, ',')).toEqual([
            ['Front', 'Back'],
            ['Say "hi", please', 'line one\nline two'],
            ['plain', 'answer'],
        ]);
        const out = convertToLemma(csv, 'flashcards', id);
        expect(out.cards).toBe(3);
        expect(out.markdown).toContain('Front::Back ^');
        expect(out.markdown).toContain('Say "hi", please\n---\nline one\nline two');
    });

    it('falls back to the block format when the text would break single-line syntax', () => {
        const out = convertToLemma('std::vector\tA C++ container\n', 'flashcards', id);
        expect(out.markdown).toContain('---card--- ^');
        expect(out.markdown).not.toMatch(/std::vector/);
    });

    it('skips empty or incomplete rows, handles Windows line endings and a BOM, and never repeats an id', () => {
        let k = 0;
        const clashing = () => `fsrs-same${k++ < 2 ? '' : k}`;
        const out = convertToLemma('﻿a\tb\r\n\r\nonlyfront\t\r\nc\td\r\n', 'flashcards', clashing);
        expect(out.cards).toBe(2);
        expect(out.skipped).toBe(1);
        const ids = [...out.markdown.matchAll(/\^(fsrs-\w+)/g)].map((m) => m[1]);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('produces cards that the real parser reads back', async () => {
        const { vi } = await import('vitest');
        vi.doMock('obsidian', () => ({ Notice: class {}, TFile: class {} }));
        vi.doMock('../src/database/PouchDBManager', () => ({ PouchDBManager: class {} }));
        const { DataManager } = await import('../src/data/DataManager');
        const { DEFAULT_SETTINGS } = await import('../src/data/constants');
        const text = 'Q1\tA1\n"Q2 with\nbreak"\tA2\nThe {{c1::sky}} is blue\nstd::map\tdictionary\n';
        const out = convertToLemma(text, 'flashcards');
        expect(out.cards).toBe(4);
        const file = { path: 'Imported.md', basename: 'Imported', stat: { mtime: 1 } };
        const plugin = {
            app: { vault: { getMarkdownFiles: () => [file], read: async () => out.markdown }, metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) } },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false },
            loadData: async () => null, saveData: async () => undefined,
        };
        const dm = new DataManager(plugin as never);
        await dm.buildIndex();
        const cards = dm.getAllCards();
        expect(cards).toHaveLength(4);
        expect(cards.map((c) => c.type).sort()).toEqual(['basic', 'basic', 'basic', 'cloze']);
        expect(cards.find((c) => c.front.startsWith('Q2'))?.back).toBe('A2');
        expect(cards.find((c) => c.front.replace(/\u200B/g, '') === 'std::map')?.back).toBe('dictionary');
    });
});
