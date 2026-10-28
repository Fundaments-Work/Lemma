// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { State } from 'ts-fsrs';

const notices = vi.hoisted(() => [] as string[]);
const keyHandlers = vi.hoisted(() => [] as Array<(evt: unknown) => void>);

vi.mock('obsidian', () => ({
    Notice: class {
        constructor(message: string) {
            notices.push(message);
        }
    },
    Component: class { unload() {} },
    Modal: class {
        contentEl = document.createElement('div');
        containerEl = document.createElement('div');
        modalEl = document.createElement('div');
        titleEl = document.createElement('div');
        scope = { register: (_m: unknown, _k: unknown, fn: (evt: unknown) => void) => { keyHandlers.push(fn); } };
        constructor(public app: unknown) {
            // Mirrors Obsidian 1.14: the header holds only the title, there is no .modal-header-controls.
            this.titleEl.className = 'modal-title';
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.append(this.titleEl);
            this.modalEl.append(header);
        }
        close() {}
    },
    ButtonComponent: class {
        buttonEl = document.createElement('button');
        constructor(parent: HTMLElement) { parent.appendChild(this.buttonEl); }
        setButtonText(text: string) { this.buttonEl.textContent = text; return this; }
        setCta() { return this; }
        setDisabled() { return this; }
        onClick(handler: () => void) { this.buttonEl.addEventListener('click', handler); return this; }
    },
    MarkdownRenderer: {
        render: async (_app: unknown, text: string, el: HTMLElement) => { el.textContent = text; },
    },
    setIcon: () => {},
}));

vi.mock('../src/database/PouchDBManager', () => ({ PouchDBManager: class {} }));

import { ReviewModal } from '../src/ui/ReviewModal';
import { DataManager } from '../src/data/DataManager';
import { DEFAULT_SETTINGS } from '../src/data/constants';
import type { Card } from '../src/data/types';

type Opts = { cls?: string; text?: string; attr?: Record<string, string> };

beforeAll(() => {
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const make = (parent: HTMLElement, tag: string, o?: Opts | string) => {
        const el = document.createElement(tag);
        const opts = typeof o === 'string' ? { cls: o } : o;
        if (opts?.cls) el.className = opts.cls;
        if (opts?.text) el.textContent = opts.text;
        for (const [k, v] of Object.entries(opts?.attr ?? {})) el.setAttribute(k, v);
        parent.appendChild(el);
        return el;
    };
    proto.createEl = function (this: HTMLElement, tag: string, o?: Opts) { return make(this, tag, o); };
    proto.createDiv = function (this: HTMLElement, o?: Opts) { return make(this, 'div', o); };
    proto.createSpan = function (this: HTMLElement, o?: Opts) { return make(this, 'span', o); };
    proto.addClass = function (this: HTMLElement, c: string) { this.classList.add(c); };
    proto.removeClass = function (this: HTMLElement, c: string) { this.classList.remove(c); };
    proto.empty = function (this: HTMLElement) { this.replaceChildren(); };
    proto.hide = function (this: HTMLElement) { this.style.display = 'none'; };
    proto.show = function (this: HTMLElement) { this.style.display = ''; };
    proto.setText = function (this: HTMLElement, t: string) { this.textContent = t; };
    proto.find = function (this: HTMLElement, s: string) { return this.querySelector(s); };
    proto.setCssProps = function (this: HTMLElement, props: Record<string, string>) {
        for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
    };
});

function makeCard(id: string, filePath: string, withData: boolean): Card {
    return {
        id, deckId: 'd', filePath, type: 'basic', originalText: '', front: `front ${id}`, back: `back ${id}`,
        fsrsData: withData ? {
            due: new Date('2026-03-01'), stability: 7.5, difficulty: 4.2, elapsed_days: 1,
            scheduled_days: 7, reps: 4, lapses: 1, state: State.Review, learning_steps: 0,
        } : undefined,
    };
}

describe('ReviewModal card info', () => {
    it('title info and edit pencil follow the current card, not the first card', async () => {
        notices.length = 0;
        const openLinkText = vi.fn().mockResolvedValue(undefined);
        const plugin = {
            settings: { fontSize: 16 },
            refreshDashboardView: vi.fn(),
            dataManager: {
                getNextReviewIntervals: () => ({ 1: '1d', 2: '2d', 3: '3d', 4: '4d' }),
                updateCard: vi.fn(),
                canUndo: () => false,
                isLeech: () => false,
            },
        };
        const app = { workspace: { openLinkText } };
        const queue = [makeCard('c1', 'first.md', false), makeCard('c2', 'second.md', true)];

        const modal = new ReviewModal(app as never, plugin as never, queue, 'Deck');
        modal.onOpen();
        await new Promise((r) => setTimeout(r, 0));

        const title = modal.modalEl.querySelector('.modal-title') as HTMLElement;
        const pencil = () => modal.modalEl.querySelector('[aria-label="Edit this card"]') as HTMLElement;

        title.click();
        pencil().click();
        expect(notices.at(-1)).toBe('This is a new card.');
        expect(openLinkText).toHaveBeenLastCalledWith('first.md', 'first.md');

        (modal.contentEl.querySelector('.fsrs-show-answer-btn') as HTMLElement).click();
        (modal.contentEl.querySelector('.fsrs-rating-good') as HTMLElement).click();
        await new Promise((r) => setTimeout(r, 0));

        title.click();
        pencil().click();
        expect(notices.at(-1)).toContain('Stability: 7.50');
        expect(openLinkText).toHaveBeenLastCalledWith('second.md', 'second.md');
    });
});

describe('ReviewModal learning flow with the real scheduler', () => {
    async function open() {
        const file = { path: 'Decks/L.md', basename: 'L', stat: { mtime: 1 } };
        const plugin = {
            app: {
                vault: { getMarkdownFiles: () => [file], read: async () => 'One::1\nTwo::2\nThree::3\n' },
                metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
                workspace: { openLinkText: vi.fn() },
            },
            settings: { ...DEFAULT_SETTINGS, gamification: { ...DEFAULT_SETTINGS.gamification }, usePouchDB: false },
            loadData: async () => null,
            saveData: async () => undefined,
            refreshDashboardView: vi.fn(),
        } as { app: unknown; settings: typeof DEFAULT_SETTINGS; dataManager?: DataManager };
        const dm = new DataManager(plugin as never);
        plugin.dataManager = dm;
        await dm.buildIndex();
        const queue = dm.getReviewQueue(dm.getDecks()[0].id);
        keyHandlers.length = 0;
        const modal = new ReviewModal(plugin.app as never, plugin as never, queue, 'Deck');
        modal.onOpen();
        await new Promise((r) => setTimeout(r, 0));
        const click = async (cls: string) => {
            (modal.contentEl.querySelector(cls) as HTMLElement).click();
            await new Promise((r) => setTimeout(r, 0));
        };
        const counter = () => modal.titleEl.querySelector('.fsrs-counter-badge')!.textContent;
        const front = () => modal.contentEl.querySelector('.fsrs-card-front')!.textContent;
        return { dm, modal, click, counter, front, queue };
    }

    it('brings an Again card back a few cards later and counts it in the session', async () => {
        const { click, counter, front, queue } = await open();
        const first = front();
        expect(counter()).toBe('1/3');

        await click('.fsrs-show-answer-btn');
        await click('.fsrs-rating-again');
        expect(queue).toHaveLength(4);
        expect(counter()).toBe('2/4');

        await click('.fsrs-show-answer-btn');
        await click('.fsrs-rating-easy');
        await click('.fsrs-show-answer-btn');
        await click('.fsrs-rating-easy');
        expect(front()).toBe(first);
        expect(counter()).toBe('4/4');
    });

    it('undoes the last rating with the button and the Z key, restoring the card and queue', async () => {
        const { dm, modal, click, counter, front, queue } = await open();
        const first = front();
        const undoBtn = () => modal.modalEl.querySelector('[aria-label="Undo last rating"]') as HTMLElement;
        expect(undoBtn().style.display).toBe('none');

        await click('.fsrs-show-answer-btn');
        await click('.fsrs-rating-good');
        expect(undoBtn().style.display).not.toBe('none');
        expect(queue.length).toBeGreaterThan(3);

        undoBtn().click();
        await new Promise((r) => setTimeout(r, 0));
        expect(front()).toBe(first);
        expect(counter()).toBe('1/3');
        expect(queue).toHaveLength(3);
        expect(dm.getReviewHistory()).toHaveLength(0);
        expect(dm.getAllCards().every((c) => !c.fsrsData)).toBe(true);

        await click('.fsrs-show-answer-btn');
        await click('.fsrs-rating-good');
        const preventDefault = vi.fn();
        keyHandlers[0]({ key: 'z', target: document.body, shiftKey: false, altKey: false, preventDefault });
        await new Promise((r) => setTimeout(r, 0));
        expect(preventDefault).toHaveBeenCalled();
        expect(dm.getReviewHistory()).toHaveLength(0);
    });

    it('does not undo when Z is typed into an answer box', async () => {
        const { dm, click } = await open();
        await click('.fsrs-show-answer-btn');
        await click('.fsrs-rating-good');
        const input = document.createElement('input');
        keyHandlers[0]({ key: 'z', target: input, shiftKey: false, altKey: false, preventDefault: vi.fn() });
        expect(dm.getReviewHistory()).toHaveLength(1);
    });

    it('buries unreviewed sibling cards in session queue when a card is rated, and restores on undo', async () => {
        const clozePara = 'The ==c1::mitochondrion== is the powerhouse of the ==c2::cell==. ^p1';
        const file = { path: 'Deck.md', basename: 'Deck', stat: { mtime: 1 } };
        const plugin = {
            app: {
                workspace: { openLinkText: vi.fn() },
                vault: { getMarkdownFiles: () => [file], read: async () => clozePara },
                metadataCache: { getFileCache: () => ({ frontmatter: { tags: ['flashcards'] } }) },
            },
            settings: { ...DEFAULT_SETTINGS, usePouchDB: false, burySiblings: true },
            loadData: async () => null,
            saveData: async () => undefined,
            refreshDashboardView: vi.fn(),
            dataManager: undefined as unknown as DataManager,
        };
        const dm = new DataManager(plugin as never);
        plugin.dataManager = dm;
        await dm.buildIndex();
        const cards = dm.getAllCards();
        expect(cards).toHaveLength(2);

        const queue = [...cards];
        const modal = new ReviewModal(plugin.app as never, plugin as never, queue, 'Deck');
        modal.onOpen();
        await new Promise((r) => setTimeout(r, 0));

        const click = async (selector: string) => {
            const el = modal.contentEl.querySelector(selector) as HTMLElement;
            el?.click();
            await new Promise((r) => setTimeout(r, 0));
        };

        expect(queue).toHaveLength(2);

        await click('.fsrs-show-answer-btn');
        await click('.fsrs-rating-good');
        // Sibling card 2 should be buried (removed from remaining queue)
        expect(queue.map((c) => c.id)).not.toContain(cards[1].id);

        const undoBtn = modal.modalEl.querySelector('[aria-label="Undo last rating"]') as HTMLElement;
        undoBtn.click();
        await new Promise((r) => setTimeout(r, 0));

        expect(queue).toHaveLength(2);
    });
});
