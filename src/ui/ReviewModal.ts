import { App, Modal, ButtonComponent, Component, MarkdownRenderer, Notice, setIcon } from 'obsidian';
import { Rating, State } from 'ts-fsrs';
import type { Card } from '../data/types';
import { isInPlaceImageCard } from '../data/constants';

type FSRSFlashcardsPlugin = import('../plugin/main').FSRSFlashcardsPlugin;

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;
const SWIPE_THRESHOLD = 60;
const LEARN_AHEAD_MS = 30 * 60 * 1000;
const REQUEUE_GAP = 4;

export class ReviewModal extends Modal {
    private plugin: FSRSFlashcardsPlugin;
    private queue: Card[];
    private deckName: string | null;
    private currentCardIndex = 0;
    private undoButton: HTMLElement | null = null;
    private state: 'question' | 'answer' = 'question';
    private isInPlaceImage = false;
    private activeInPlaceView: 'question' | 'answer' = 'question';
    private cardContainer: HTMLElement;
    private frontEl: HTMLElement;
    private backEl: HTMLElement;
    private answerContainer: HTMLElement;
    private inplaceIndicatorEl: HTMLElement;
    private controlsContainer: HTMLElement;
    private showAnswerButton: ButtonComponent;
    private renderComponent: Component = new Component();
    private typeinContainer: HTMLElement;
    private typeinInput: HTMLInputElement;
    private typeinFeedback: HTMLElement;
    private typeinCheckBtn: ButtonComponent;

    private gestureStartX = 0;
    private gestureStartY = 0;
    private gestureCurrentX = 0;
    private gestureCurrentY = 0;
    private isGesturing = false;
    private boundHandlers: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];

    constructor(app: App, plugin: FSRSFlashcardsPlugin, queue: Card[], deckName?: string) {
        super(app);
        this.plugin = plugin;
        this.queue = queue;
        this.deckName = deckName || null;
    }

    onOpen() {
        this.renderComponent = new Component();
        this.containerEl.addClass('fsrs-review-modal-immersive');
        const deckPrefix = this.deckName ? this.deckName : 'Reviewing';
        this.titleEl.empty();
        this.titleEl.createSpan({ text: deckPrefix });
        this.titleEl.createSpan({ text: `${this.currentCardIndex + 1}/${this.queue.length}`, cls: 'fsrs-counter-badge' });
        this.setupUI();
        void this.showNextCard();
        for (const key of [' ', 'Enter', '1', '2', '3', '4', 'z', 'Z']) {
            this.scope.register([], key, (evt: KeyboardEvent) => this.handleKeyPress(evt));
        }
    }

    onClose() {
        for (const { target, type, handler } of this.boundHandlers) {
            target.removeEventListener(type, handler);
        }
        this.boundHandlers = [];
        this.renderComponent.unload();
        this.contentEl.empty();
        this.plugin.refreshDashboardView();
    }

    private setupUI() {
        const card = this.getCurrentCard();
        this.modalEl.find('.modal-title').addEventListener('click', () => {
            const data = this.getCurrentCard().fsrsData;
            if (!data) { new Notice('This is a new card.'); return; }
            const info = `Stability: ${data.stability.toFixed(2)}\nDifficulty: ${data.difficulty.toFixed(2)}\nReps: ${data.reps}\nLapses: ${data.lapses}\nDue: ${data.due.toLocaleDateString()}`;
            new Notice(info, 10000);
        });
        this.modalEl.find('.modal-title').addClass('fsrs-card-info-title');

        const headerControls = this.modalEl.querySelector('.modal-header-controls')
            ?? this.modalEl.querySelector('.modal-header')?.createDiv({ cls: 'fsrs-header-actions' });
        if (headerControls) {
            this.undoButton = headerControls.createDiv({ cls: 'clickable-icon' });
            setIcon(this.undoButton, 'undo-2');
            this.undoButton.setAttribute('aria-label', 'Undo last rating');
            this.undoButton.addEventListener('click', () => this.undoRating());
            this.updateUndoButton();

            const editBtn = headerControls.createDiv({ cls: 'clickable-icon' });
            setIcon(editBtn, 'pencil');
            editBtn.setAttribute('aria-label', 'Edit this card');
            editBtn.addEventListener('click', () => {
                const { filePath } = this.getCurrentCard();
                void this.app.workspace.openLinkText(filePath, filePath);
                this.close();
            });

            const closeBtn = headerControls.createDiv({ cls: 'clickable-icon' });
            setIcon(closeBtn, 'x');
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.addEventListener('click', () => this.close());
        }

        const container = this.contentEl.createDiv({ cls: 'fsrs-review-container' });

        this.cardContainer = container.createDiv({ cls: 'fsrs-review-card' });
        this.cardContainer.setCssProps({ '--fsrs-card-font-size': `${this.plugin.settings.fontSize}px` });

        const contextEl = this.cardContainer.createDiv({ cls: 'fsrs-card-context' });
        if (card.context) {
            contextEl.setText(card.context);
        } else {
            contextEl.addClass('fsrs-card-context-hidden');
        }

        this.frontEl = this.cardContainer.createDiv({ cls: 'fsrs-card-front' });
        this.answerContainer = this.cardContainer.createDiv({ cls: 'fsrs-card-answer' });
        this.answerContainer.hide();
        this.answerContainer.createEl('hr');
        this.backEl = this.answerContainer.createDiv({ cls: 'fsrs-card-back' });
        this.inplaceIndicatorEl = this.cardContainer.createDiv({ cls: 'fsrs-inplace-indicator' });
        this.inplaceIndicatorEl.hide();

        const bottomControlsContainer = container.createDiv({ cls: 'fsrs-bottom-controls' });

        this.showAnswerButton = new ButtonComponent(bottomControlsContainer)
            .setButtonText('Show answer')
            .setCta()
            .onClick(() => this.showAnswer());
        this.showAnswerButton.buttonEl.addClass('fsrs-show-answer-btn');

        this.controlsContainer = bottomControlsContainer.createDiv({ cls: 'fsrs-review-controls' });
        this.controlsContainer.hide();

        this.typeinContainer = container.createDiv({ cls: 'fsrs-typein-container' });
        this.typeinContainer.hide();

        this.typeinInput = this.typeinContainer.createEl('input', {
            cls: 'fsrs-typein-input',
            attr: { type: 'text', placeholder: 'Type your answer...', autocomplete: 'off', spellcheck: 'false' },
        });
        this.typeinFeedback = this.typeinContainer.createDiv({ cls: 'fsrs-typein-feedback' });
        this.typeinFeedback.hide();

        this.typeinInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.typeinCheckBtn.buttonEl.click();
            }
        });

        this.typeinCheckBtn = new ButtonComponent(this.typeinContainer)
            .setButtonText('Check')
            .setCta()
            .onClick(() => {
                const card = this.getCurrentCard();
                const typed = this.typeinInput.value.trim();
                const correct = card.back.trim();
                if (!typed) return;

                const exactMatch = typed.toLowerCase() === correct.toLowerCase();
                const keywordMatch = !exactMatch && correct.toLowerCase().split(/\s+/).some(word =>
                    word.length > 3 && typed.toLowerCase().includes(word.toLowerCase())
                );

                this.typeinFeedback.empty();
                this.typeinFeedback.show();
                this.typeinInput.disabled = true;
                this.typeinCheckBtn.setDisabled(true);

                if (exactMatch) {
                    this.typeinFeedback.createSpan({ text: 'Correct', cls: 'fsrs-typein-correct' });
                } else if (keywordMatch) {
                    this.typeinFeedback.createSpan({ text: 'Close match', cls: 'fsrs-typein-partial' });
                } else {
                    this.typeinFeedback.createSpan({ text: 'Not correct', cls: 'fsrs-typein-wrong' });
                }
                this.typeinFeedback.createEl('p', { text: `Correct answer: ${correct}`, cls: 'fsrs-typein-answer' });

                this.createControlButtons();
                this.state = 'answer';
                this.controlsContainer.show();
                this.showAnswerButton.buttonEl.hide();
                this.answerContainer.show();
            });
        this.typeinCheckBtn.buttonEl.addClass('fsrs-typein-check-btn');

        const addHandler = (target: EventTarget, type: string, handler: EventListener) => {
            target.addEventListener(type, handler);
            this.boundHandlers.push({ target, type, handler });
        };
        addHandler(this.cardContainer, 'pointerdown', (e: Event) => this.onGestureStart(e as PointerEvent));
        addHandler(this.cardContainer, 'pointermove', (e: Event) => this.onGestureMove(e as PointerEvent));
        addHandler(this.cardContainer, 'pointerup', (e: Event) => this.onGestureEnd(e as PointerEvent));
        addHandler(this.cardContainer, 'pointerleave', (e: Event) => this.onGestureEnd(e as PointerEvent));
    }

    private onGestureStart(e: PointerEvent) {
        if (this.state !== 'answer') return;
        this.isGesturing = true;
        this.gestureStartX = e.clientX;
        this.gestureStartY = e.clientY;
        this.gestureCurrentX = e.clientX;
        this.gestureCurrentY = e.clientY;
    }

    private onGestureMove(e: PointerEvent) {
        if (!this.isGesturing || this.state !== 'answer') return;
        this.gestureCurrentX = e.clientX;
        this.gestureCurrentY = e.clientY;

        const dx = this.gestureCurrentX - this.gestureStartX;
        const dy = this.gestureCurrentY - this.gestureStartY;

        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            this.cardContainer.setCssProps({
                '--fsrs-swipe-dx': `${dx * 0.4}px`,
                '--fsrs-swipe-dy': `${dy * 0.2}px`,
                '--fsrs-swipe-rot': `${dx * 0.02}deg`,
            });
            const direction = this.getSwipeDirection(dx, dy);
            this.cardContainer.removeClass('fsrs-swipe-left', 'fsrs-swipe-right', 'fsrs-swipe-up', 'fsrs-swipe-down');
            if (direction) {
                this.cardContainer.addClass(`fsrs-swipe-${direction}`);
            }
        }
    }

    private onGestureEnd(e: PointerEvent) {
        if (!this.isGesturing) return;
        this.isGesturing = false;

        const dx = this.gestureCurrentX - this.gestureStartX;
        const dy = this.gestureCurrentY - this.gestureStartY;
        const direction = this.getSwipeDirection(dx, dy);

        this.cardContainer.setCssProps({ '--fsrs-swipe-dx': '', '--fsrs-swipe-dy': '', '--fsrs-swipe-rot': '' });
        this.cardContainer.removeClass('fsrs-swipe-left', 'fsrs-swipe-right', 'fsrs-swipe-up', 'fsrs-swipe-down');

        if (!direction || this.state !== 'answer') {
            if (e.type === 'pointerup' && this.isInPlaceImage && this.state === 'answer' && Math.hypot(dx, dy) < 10) {
                this.toggleInPlaceView();
            }
            return;
        }

        const ratingMap: Record<string, Rating> = {
            left: Rating.Again,
            down: Rating.Hard,
            right: Rating.Good,
            up: Rating.Easy,
        };

        const rating = ratingMap[direction];
        if (rating !== undefined) {
            this.handleRating(rating);
        }
    }

    private getSwipeDirection(dx: number, dy: number): SwipeDirection {
        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return null;

        if (Math.abs(dx) >= Math.abs(dy)) {
            return dx < 0 ? 'left' : 'right';
        } else {
            return dy < 0 ? 'up' : 'down';
        }
    }

    private createControlButtons() {
        this.controlsContainer.empty();
        this.controlsContainer.show();
        const card = this.getCurrentCard();
        const intervals = this.plugin.dataManager.getNextReviewIntervals(card);

        const ratings: Array<{ text: string; rating: Exclude<Rating, Rating.Manual>; cls: string }> = [
            { text: 'Again', rating: Rating.Again, cls: 'fsrs-rating-again' },
            { text: 'Hard', rating: Rating.Hard, cls: 'fsrs-rating-hard' },
            { text: 'Good', rating: Rating.Good, cls: 'fsrs-rating-good' },
            { text: 'Easy', rating: Rating.Easy, cls: 'fsrs-rating-easy' },
        ];

        for (const { text, rating, cls } of ratings) {
            const btn = new ButtonComponent(this.controlsContainer)
                .onClick(() => this.handleRating(rating));
            btn.buttonEl.addClass(cls);
            btn.buttonEl.createSpan({ text, cls: 'fsrs-rating-text' });
            btn.buttonEl.createEl('small', { text: intervals[rating], cls: 'fsrs-interval-hint' });
        }
    }

    private async showNextCard() {
        if (this.currentCardIndex >= this.queue.length) { this.showCompletionScreen(); return; }

        this.answerContainer.hide();
        this.controlsContainer.hide();

        this.state = 'question';
        const card = this.getCurrentCard();
        this.isInPlaceImage = card.type !== 'typein' && isInPlaceImageCard(card);
        this.activeInPlaceView = 'question';

        if (this.isInPlaceImage) {
            this.cardContainer.addClass('fsrs-card-inplace');
        } else {
            this.cardContainer.removeClass('fsrs-card-inplace');
        }
        this.inplaceIndicatorEl.hide();

        const deckPrefix = this.deckName ? this.deckName : 'Reviewing';
        this.titleEl.empty();
        this.titleEl.createSpan({ text: deckPrefix });
        this.titleEl.createSpan({ text: `${this.currentCardIndex + 1}/${this.queue.length}`, cls: 'fsrs-counter-badge' });
        if (this.plugin.dataManager.isLeech?.(card)) {
            const lapses = card.fsrsData?.lapses ?? 0;
            this.titleEl.createSpan({
                text: `Leech (${lapses} lapses)`,
                cls: 'fsrs-leech-badge',
                attr: { title: 'This card has lapsed repeatedly. Consider simplifying, splitting, or rewriting it.' },
            });
        }

        this.frontEl.empty();
        this.backEl.empty();

        const contextEl = this.cardContainer.querySelector('.fsrs-card-context') as HTMLElement;
        if (contextEl) {
            if (card.context) {
                contextEl.setText(card.context);
                contextEl.removeClass('fsrs-card-context-hidden');
            } else {
                contextEl.addClass('fsrs-card-context-hidden');
            }
        }

        this.frontEl.show();
        await MarkdownRenderer.render(this.app, card.front, this.frontEl, card.filePath, this.renderComponent);
        await MarkdownRenderer.render(this.app, card.back, this.backEl, card.filePath, this.renderComponent);

        if (card.type === 'typein') {
            this.showAnswerButton.buttonEl.hide();
            this.typeinContainer.show();
            this.typeinInput.value = '';
            this.typeinInput.disabled = false;
            this.typeinCheckBtn.setDisabled(false);
            this.typeinFeedback.empty();
            this.typeinFeedback.hide();
            this.typeinInput.focus();
        } else {
            this.showAnswerButton.buttonEl.show();
            this.typeinContainer.hide();
        }
    }

    private showAnswer() {
        if (this.state === 'answer') return;
        this.createControlButtons();
        this.state = 'answer';
        this.showAnswerButton.buttonEl.hide();
        this.controlsContainer.show();

        if (this.isInPlaceImage) {
            this.frontEl.hide();
            this.answerContainer.show();
            this.activeInPlaceView = 'answer';
            this.inplaceIndicatorEl.setText('Answer (tap to peek question)');
            this.inplaceIndicatorEl.show();
        } else {
            this.frontEl.show();
            this.answerContainer.show();
            this.inplaceIndicatorEl.hide();
        }
    }

    private toggleInPlaceView() {
        if (!this.isInPlaceImage || this.state !== 'answer') return;

        if (this.activeInPlaceView === 'answer') {
            this.activeInPlaceView = 'question';
            this.frontEl.show();
            this.answerContainer.hide();
            this.inplaceIndicatorEl.setText('Question (tap to see answer)');
        } else {
            this.activeInPlaceView = 'answer';
            this.frontEl.hide();
            this.answerContainer.show();
            this.inplaceIndicatorEl.setText('Answer (tap to peek question)');
        }
    }

    private buriedStack: Array<{ cardId: string; siblings: Card[] }> = [];

    private handleRating(rating: Rating) {
        const card = this.getCurrentCard();
        this.plugin.dataManager.updateCard(card, rating);
        const data = card.fsrsData;
        if (data && (data.state === State.Learning || data.state === State.Relearning)
            && data.due.getTime() - Date.now() <= LEARN_AHEAD_MS) {
            const at = Math.min(this.queue.length, this.currentCardIndex + 1 + REQUEUE_GAP);
            this.queue.splice(at, 0, card);
        }

        if (this.plugin.settings.burySiblings) {
            const siblings: Card[] = [];
            for (let i = this.queue.length - 1; i > this.currentCardIndex; i--) {
                if (this.plugin.dataManager.areSiblings(card, this.queue[i])) {
                    siblings.push(this.queue[i]);
                    this.queue.splice(i, 1);
                }
            }
            if (siblings.length > 0) {
                this.buriedStack.push({ cardId: card.id, siblings });
            }
        }

        this.currentCardIndex++;
        this.updateUndoButton();
        void this.showNextCard();
    }

    private undoRating() {
        if (this.currentCardIndex === 0 || !this.plugin.dataManager.canUndo()) return;
        const card = this.plugin.dataManager.undoLastRating();
        if (!card) return;
        this.currentCardIndex--;
        const duplicate = this.queue.indexOf(card, this.currentCardIndex + 1);
        if (duplicate > this.currentCardIndex) this.queue.splice(duplicate, 1);

        if (this.buriedStack.length > 0 && this.buriedStack[this.buriedStack.length - 1].cardId === card.id) {
            const entry = this.buriedStack.pop();
            if (entry) {
                this.queue.push(...entry.siblings);
            }
        }

        this.updateUndoButton();
        void this.showNextCard();
    }

    private updateUndoButton() {
        if (!this.undoButton) return;
        if (this.currentCardIndex > 0 && this.plugin.dataManager.canUndo()) {
            this.undoButton.show();
        } else {
            this.undoButton.hide();
        }
    }

    private showCompletionScreen() {
        this.contentEl.empty();
        this.titleEl.setText('Session complete!');
        const container = this.contentEl.createDiv({ cls: 'fsrs-completion-screen' });
        container.createEl('h2', { text: 'Great work!' });
        container.createEl('p', { text: `You have completed ${this.queue.length} cards.` });
        new ButtonComponent(container).setButtonText('Return to dashboard').setCta().onClick(() => this.close());
    }

    private handleKeyPress(evt: KeyboardEvent) {
        if (evt.key === 'Escape') {
            this.close();
            return;
        }

        const typing = evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement;
        if (typing) return;
        if (evt.key.toLowerCase() === 'z' && !evt.shiftKey && !evt.altKey) {
            evt.preventDefault();
            this.undoRating();
            return;
        }

        if (this.state === 'question') {
            if (evt.key === ' ' || evt.key === 'Enter') {
                evt.preventDefault();
                this.showAnswer();
            }
            return;
        }

        if (this.state === 'answer') {
            if (this.isInPlaceImage && (evt.key === ' ' || evt.key === 'Enter' || evt.key === 'p' || evt.key === 'f')) {
                evt.preventDefault();
                this.toggleInPlaceView();
                return;
            }
            switch (evt.key) {
                case '1':
                    evt.preventDefault();
                    this.handleRating(Rating.Again);
                    break;
                case '2':
                    evt.preventDefault();
                    this.handleRating(Rating.Hard);
                    break;
                case '3':
                    evt.preventDefault();
                    this.handleRating(Rating.Good);
                    break;
                case '4':
                    evt.preventDefault();
                    this.handleRating(Rating.Easy);
                    break;
            }
        }
    }

    private getCurrentCard(): Card { return this.queue[this.currentCardIndex]; }
}
