vi.mock('obsidian', () => {
    class MockElement {
        tagName = 'DIV';
        classList = new Set<string>();
        children: MockElement[] = [];
        style = { setProperty: vi.fn(), getPropertyValue: vi.fn() };
        textContent = '';
        value = '';
        disabled = false;
        eventListeners: Record<string, EventListener[]> = {};

        addClass(...classes: string[]) {
            classes.forEach(c => this.classList.add(c));
            return this;
        }
        removeClass(...classes: string[]) {
            classes.forEach(c => this.classList.delete(c));
            return this;
        }
        hasClass(cls: string) {
            return this.classList.has(cls);
        }
        setText(text: string) {
            this.textContent = text;
            return this;
        }
        getText() {
            return this.textContent;
        }
        empty() {
            this.children = [];
            this.textContent = '';
            return this;
        }
        show() {
            this.removeClass('is-hidden');
            return this;
        }
        hide() {
            this.addClass('is-hidden');
            return this;
        }
        createDiv(opts?: { cls?: string; text?: string }) {
            const el = new MockElement();
            if (opts?.cls) opts.cls.split(' ').filter(Boolean).forEach(c => el.addClass(c));
            if (opts?.text) el.setText(opts.text);
            this.children.push(el);
            return el;
        }
        createSpan(opts?: { cls?: string; text?: string }) {
            return this.createDiv(opts);
        }
        createEl(tag: string, opts?: { cls?: string; text?: string }) {
            const el = new MockElement();
            el.tagName = tag.toUpperCase();
            if (opts?.cls) opts.cls.split(' ').filter(Boolean).forEach(c => el.addClass(c));
            if (opts?.text) el.setText(opts.text);
            this.children.push(el);
            return el;
        }
        querySelector(sel: string): MockElement | null {
            if (sel.startsWith('.')) {
                const cls = sel.slice(1);
                const find = (node: MockElement): MockElement | null => {
                    if (node.hasClass(cls)) return node;
                    for (const child of node.children) {
                        const res = find(child);
                        if (res) return res;
                    }
                    return null;
                };
                return find(this);
            }
            return null;
        }
        find(sel: string) {
            return this.querySelector(sel) || new MockElement();
        }
        setAttribute(_name: string, _val: string) {}
        getAttribute(_name: string) { return null; }
        prepend(el: MockElement) {
            this.children.unshift(el);
        }
        setCssProps() {}
        addEventListener(type: string, handler: EventListener) {
            if (!this.eventListeners[type]) this.eventListeners[type] = [];
            this.eventListeners[type].push(handler);
        }
        removeEventListener(type: string, handler: EventListener) {
            if (this.eventListeners[type]) {
                this.eventListeners[type] = this.eventListeners[type].filter(h => h !== handler);
            }
        }
        dispatchEvent(event: { type: string }) {
            const handlers = this.eventListeners[event.type] || [];
            handlers.forEach(h => h(event as never));
        }
    }

    class MockNotice {
        constructor(public message: string, public duration?: number) {}
    }
    class MockTFile {
        path: string;
        basename: string;
        constructor(path: string, basename?: string) {
            this.path = path;
            this.basename = basename || path.split('/').pop() || 'untitled';
        }
    }
    class MockModal {
        app: unknown;
        contentEl = new MockElement();
        containerEl = new MockElement();
        modalEl = new MockElement();
        titleEl = new MockElement();
        scope = { register: vi.fn() };
        constructor(app: unknown) {
            this.app = app;
            const title = this.modalEl.createDiv({ cls: 'modal-title' });
            this.modalEl.createDiv({ cls: 'modal-header-controls' });
            this.titleEl = title;
        }
        open() {}
        close() {}
    }

    class MockButtonComponent {
        buttonEl = new MockElement();
        onClickCallback: (() => void) | null = null;
        setIcon() { return this; }
        setButtonText(text: string) {
            this.buttonEl.setText(text);
            return this;
        }
        setCta() { return this; }
        setWarning() { return this; }
        setDisabled(val: boolean) {
            this.buttonEl.disabled = val;
            return this;
        }
        setTooltip() { return this; }
        onClick(cb: () => void) {
            this.onClickCallback = cb;
            return this;
        }
    }

    return {
        Notice: MockNotice,
        TFile: MockTFile,
        Component: class { unload() {} },
        Plugin: class {},
        Modal: MockModal,
        ButtonComponent: MockButtonComponent,
        MarkdownRenderer: {
            render: vi.fn().mockResolvedValue(undefined),
        },
        setIcon: vi.fn(),
        debounce: (fn: (...args: unknown[]) => unknown) => fn,
    };
});

vi.mock('../src/database/PouchDBManager', () => {
    class MockPouchDBManager {
        async getAllCardStates() { return {}; }
        async getReviewHistory() { return []; }
        async saveCardState() { return Promise.resolve(); }
        async addReviewLog() { return Promise.resolve(); }
        async destroy() { return Promise.resolve(); }
        async setupSync() { return Promise.resolve(); }
        async stopSync() { return Promise.resolve(); }
        async manualSync() { return Promise.resolve(); }
        async getSyncStatus() { return { enabled: false }; }
        async getDatabaseInfo() { return { doc_count: 0 }; }
        async testConnection() { return { remoteInfo: {}, localInfo: {} }; }
        isSyncing() { return false; }
        onSyncChange() {}
        onSyncError() {}
        onSyncActive() {}
        onSyncPaused() {}
    }
    return { PouchDBManager: MockPouchDBManager };
});

import { describe, it, expect, vi } from 'vitest';
import { isImageOnlyContent, isInPlaceImageCard, DEFAULT_SETTINGS } from '../src/data/constants';
import { DataManager } from '../src/data/DataManager';
import { ReviewModal } from '../src/ui/ReviewModal';
import type { Card } from '../src/data/types';

function createMockPlugin() {
    const app = {
        vault: {
            getMarkdownFiles: vi.fn().mockReturnValue([]),
            read: vi.fn().mockResolvedValue(''),
            on: vi.fn().mockReturnValue(vi.fn()),
        },
        metadataCache: {
            getFileCache: vi.fn().mockReturnValue(null),
            getCache: vi.fn().mockReturnValue(null),
        },
        workspace: {
            getLeavesOfType: vi.fn().mockReturnValue([]),
            revealLeaf: vi.fn().mockResolvedValue(undefined),
            getLeaf: vi.fn().mockReturnValue({ setViewState: vi.fn().mockResolvedValue(undefined) }),
            rootSplit: {},
            on: vi.fn().mockReturnValue(vi.fn()),
            openLinkText: vi.fn().mockResolvedValue(undefined),
        },
    };
    const plugin = {
        app,
        settings: { ...DEFAULT_SETTINGS },
        dataManager: null as unknown as DataManager,
        loadData: vi.fn().mockResolvedValue(null),
        saveData: vi.fn().mockResolvedValue(undefined),
        saveSettings: vi.fn().mockResolvedValue(undefined),
        refreshDashboardView: vi.fn(),
    };
    plugin.dataManager = new DataManager(plugin as never);
    return plugin;
}

describe('In-place image occlusion detection', () => {
    describe('isImageOnlyContent', () => {
        it('detects standard wiki image links', () => {
            expect(isImageOnlyContent('![[image.png]]')).toBe(true);
            expect(isImageOnlyContent('![[photo.JPG]]')).toBe(true);
            expect(isImageOnlyContent('![[graphic.jpeg]]')).toBe(true);
            expect(isImageOnlyContent('![[animation.gif]]')).toBe(true);
            expect(isImageOnlyContent('![[visual.webp]]')).toBe(true);
            expect(isImageOnlyContent('![[diagram.svg]]')).toBe(true);
            expect(isImageOnlyContent('![[image.bmp]]')).toBe(true);
            expect(isImageOnlyContent('![[image.avif]]')).toBe(true);
            expect(isImageOnlyContent('![[image.tiff]]')).toBe(true);
        });

        it('detects Excalidraw embeds', () => {
            expect(isImageOnlyContent('![[drawing.excalidraw]]')).toBe(true);
            expect(isImageOnlyContent('![[drawing.excalidraw.svg]]')).toBe(true);
            expect(isImageOnlyContent('![[drawing.excalidraw.png]]')).toBe(true);
            expect(isImageOnlyContent('![[drawing.excalidraw.md]]')).toBe(true);
            expect(isImageOnlyContent('![[drawing.excalidraw|500]]')).toBe(true);
        });

        it('detects wiki images with dimensions or alt text', () => {
            expect(isImageOnlyContent('![[image.png|600]]')).toBe(true);
            expect(isImageOnlyContent('![[image.png|600x400]]')).toBe(true);
            expect(isImageOnlyContent('![[diagram.svg|Heart Anatomy Diagram]]')).toBe(true);
            expect(isImageOnlyContent('![[subfolder/diagram.png|500]]')).toBe(true);
        });

        it('detects standard Markdown images', () => {
            expect(isImageOnlyContent('![](image.png)')).toBe(true);
            expect(isImageOnlyContent('![caption](image.png)')).toBe(true);
            expect(isImageOnlyContent('![caption](assets/diagram.png)')).toBe(true);
            expect(isImageOnlyContent('![photo](https://example.com/photo.jpg)')).toBe(true);
            expect(isImageOnlyContent('![diagram](diagram.svg "Title")')).toBe(true);
        });

        it('detects images with block IDs', () => {
            expect(isImageOnlyContent('![[image.png]] ^block123')).toBe(true);
            expect(isImageOnlyContent('![[image.png]] ^fsrs-abc123')).toBe(true);
            expect(isImageOnlyContent('![[image.png]]\n^block123')).toBe(true);
            expect(isImageOnlyContent('![caption](image.png) ^block123')).toBe(true);
        });

        it('rejects mixed text and images', () => {
            expect(isImageOnlyContent('Look at this ![[image.png]]')).toBe(false);
            expect(isImageOnlyContent('![[image.png]] and text after')).toBe(false);
            expect(isImageOnlyContent('What is this diagram? ![[image.png]]')).toBe(false);
            expect(isImageOnlyContent('![[image1.png]] ![[image2.png]]')).toBe(false);
        });

        it('rejects non-image markdown and notes', () => {
            expect(isImageOnlyContent('![[Lecture Note]]')).toBe(false);
            expect(isImageOnlyContent('![[Lecture Note.md]]')).toBe(false);
            expect(isImageOnlyContent('[[image.png]]')).toBe(false);
            expect(isImageOnlyContent('[image.png](image.png)')).toBe(false);
            expect(isImageOnlyContent('Plain text without images')).toBe(false);
            expect(isImageOnlyContent('==c1::mitochondria==')).toBe(false);
            expect(isImageOnlyContent('')).toBe(false);
            expect(isImageOnlyContent('   ')).toBe(false);
            expect(isImageOnlyContent(undefined as never)).toBe(false);
            expect(isImageOnlyContent(null as never)).toBe(false);
        });
    });

    describe('isInPlaceImageCard', () => {
        it('returns true when both front and back are image embeds', () => {
            const card: Card = {
                id: 'card-1',
                deckId: 'deck-1',
                filePath: 'notes/anatomy.md',
                type: 'basic',
                originalText: '...',
                front: '![[anatomy-q.png]]',
                back: '![[anatomy-a.png]]',
            };
            expect(isInPlaceImageCard(card)).toBe(true);
        });

        it('returns false when only front is an image', () => {
            const card: Card = {
                id: 'card-2',
                deckId: 'deck-1',
                filePath: 'notes/anatomy.md',
                type: 'basic',
                originalText: '...',
                front: '![[anatomy-q.png]]',
                back: 'This is the heart',
            };
            expect(isInPlaceImageCard(card)).toBe(false);
        });

        it('returns false when only back is an image', () => {
            const card: Card = {
                id: 'card-3',
                deckId: 'deck-1',
                filePath: 'notes/anatomy.md',
                type: 'basic',
                originalText: '...',
                front: 'What does a neuron look like?',
                back: '![[neuron.png]]',
            };
            expect(isInPlaceImageCard(card)).toBe(false);
        });

        it('returns false for null or undefined card', () => {
            expect(isInPlaceImageCard(null)).toBe(false);
            expect(isInPlaceImageCard(undefined)).toBe(false);
        });
    });
});

describe('Card parsing for image occlusion cards', () => {
    it('parses single-line image occlusion cards', async () => {
        const plugin = createMockPlugin();
        const dm = plugin.dataManager;
        plugin.app.metadataCache.getFileCache = vi.fn().mockReturnValue({
            tags: [{ tag: '#flashcards', position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } } }],
        });
        plugin.app.vault.read = vi.fn().mockResolvedValue(`---
tags: [flashcards]
---

![[heart-occluded.png]]::![[heart-revealed.png]]
`);
        await dm.updateFile({ path: 'anatomy.md', basename: 'anatomy' } as never);
        const cards = dm.getAllCards();
        expect(cards).toHaveLength(1);
        expect(cards[0].front).toBe('![[heart-occluded.png]]');
        expect(cards[0].back).toBe('![[heart-revealed.png]]');
        expect(isInPlaceImageCard(cards[0])).toBe(true);
    });

    it('parses single-line image occlusion cards with block IDs', async () => {
        const plugin = createMockPlugin();
        const dm = plugin.dataManager;
        plugin.app.metadataCache.getFileCache = vi.fn().mockReturnValue({
            tags: [{ tag: '#flashcards', position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } } }],
        });
        plugin.app.vault.read = vi.fn().mockResolvedValue(`---
tags: [flashcards]
---

![[cell-mask.svg|500]]::![[cell-unmasked.svg|500]] ^cell-01
`);
        await dm.updateFile({ path: 'biology.md', basename: 'biology' } as never);
        const cards = dm.getAllCards();
        expect(cards).toHaveLength(1);
        expect(cards[0].id).toContain('cell-01');
        expect(cards[0].front).toBe('![[cell-mask.svg|500]]');
        expect(cards[0].back).toBe('![[cell-unmasked.svg|500]]');
        expect(isInPlaceImageCard(cards[0])).toBe(true);
    });

    it('parses block-style image occlusion cards', async () => {
        const plugin = createMockPlugin();
        const dm = plugin.dataManager;
        plugin.app.metadataCache.getFileCache = vi.fn().mockReturnValue({
            tags: [{ tag: '#flashcards', position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } } }],
        });
        plugin.app.vault.read = vi.fn().mockResolvedValue(`---
tags: [flashcards]
---

---card--- ^brain-diag
![[brain-occluded.png]]
---
![[brain-revealed.png]]
`);
        await dm.updateFile({ path: 'neuro.md', basename: 'neuro' } as never);
        const cards = dm.getAllCards();
        expect(cards).toHaveLength(1);
        expect(cards[0].front).toBe('![[brain-occluded.png]]');
        expect(cards[0].back).toBe('![[brain-revealed.png]]');
        expect(isInPlaceImageCard(cards[0])).toBe(true);
    });

    it('parses reversed image occlusion cards', async () => {
        const plugin = createMockPlugin();
        const dm = plugin.dataManager;
        plugin.app.metadataCache.getFileCache = vi.fn().mockReturnValue({
            tags: [{ tag: '#flashcards', position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } } }],
        });
        plugin.app.vault.read = vi.fn().mockResolvedValue(`---
tags: [flashcards]
---

![[map-mask.png]]:::![[map-answers.png]]
`);
        await dm.updateFile({ path: 'geography.md', basename: 'geography' } as never);
        const cards = dm.getAllCards();
        expect(cards).toHaveLength(1);
        expect(cards[0].type).toBe('reversed');
        expect(isInPlaceImageCard(cards[0])).toBe(true);
    });
});

describe('ReviewModal in-place occlusion interaction', () => {
    it('handles in-place display and tap-to-flip for image cards', async () => {
        const plugin = createMockPlugin();
        const card: Card = {
            id: 'image-card-1',
            deckId: 'deck-1',
            filePath: 'anatomy.md',
            type: 'basic',
            originalText: '...',
            front: '![[diagram-q.png]]',
            back: '![[diagram-a.png]]',
        };

        const modal = new ReviewModal(plugin.app as never, plugin as never, [card]);
        modal.open();
        modal.onOpen();

        const cardContainer = (modal as unknown as { cardContainer: { hasClass: (c: string) => boolean } }).cardContainer;
        const frontEl = (modal as unknown as { frontEl: { hasClass: (c: string) => boolean } }).frontEl;
        const answerContainer = (modal as unknown as { answerContainer: { hasClass: (c: string) => boolean } }).answerContainer;
        const indicatorEl = (modal as unknown as { inplaceIndicatorEl: { getText: () => string; hasClass: (c: string) => boolean } }).inplaceIndicatorEl;

        expect(cardContainer.hasClass('fsrs-card-inplace')).toBe(true);
        expect(frontEl.hasClass('is-hidden')).toBe(false);
        expect(answerContainer.hasClass('is-hidden')).toBe(true);

        (modal as unknown as { showAnswer: () => void }).showAnswer();

        expect(frontEl.hasClass('is-hidden')).toBe(true);
        expect(answerContainer.hasClass('is-hidden')).toBe(false);
        expect(indicatorEl.hasClass('is-hidden')).toBe(false);
        expect(indicatorEl.getText()).toBe('Answer (tap to peek question)');

        (modal as unknown as { toggleInPlaceView: () => void }).toggleInPlaceView();

        expect(frontEl.hasClass('is-hidden')).toBe(false);
        expect(answerContainer.hasClass('is-hidden')).toBe(true);
        expect(indicatorEl.getText()).toBe('Question (tap to see answer)');

        (modal as unknown as { toggleInPlaceView: () => void }).toggleInPlaceView();

        expect(frontEl.hasClass('is-hidden')).toBe(true);
        expect(answerContainer.hasClass('is-hidden')).toBe(false);
        expect(indicatorEl.getText()).toBe('Answer (tap to peek question)');

        modal.close();
    });

    it('keeps standard cards unmodified with front and answer visible together', async () => {
        const plugin = createMockPlugin();
        const textCard: Card = {
            id: 'text-card-1',
            deckId: 'deck-1',
            filePath: 'trivia.md',
            type: 'basic',
            originalText: '...',
            front: 'What is the speed of light?',
            back: '299,792,458 m/s',
        };

        const modal = new ReviewModal(plugin.app as never, plugin as never, [textCard]);
        modal.open();
        modal.onOpen();

        const cardContainer = (modal as unknown as { cardContainer: { hasClass: (c: string) => boolean } }).cardContainer;
        const frontEl = (modal as unknown as { frontEl: { hasClass: (c: string) => boolean } }).frontEl;
        const answerContainer = (modal as unknown as { answerContainer: { hasClass: (c: string) => boolean } }).answerContainer;
        const indicatorEl = (modal as unknown as { inplaceIndicatorEl: { hasClass: (c: string) => boolean } }).inplaceIndicatorEl;

        expect(cardContainer.hasClass('fsrs-card-inplace')).toBe(false);
        expect(frontEl.hasClass('is-hidden')).toBe(false);
        expect(answerContainer.hasClass('is-hidden')).toBe(true);

        (modal as unknown as { showAnswer: () => void }).showAnswer();

        expect(frontEl.hasClass('is-hidden')).toBe(false);
        expect(answerContainer.hasClass('is-hidden')).toBe(false);
        expect(indicatorEl.hasClass('is-hidden')).toBe(true);

        modal.close();
    });
});
