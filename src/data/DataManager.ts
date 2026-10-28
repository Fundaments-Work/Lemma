import { FSRS, Rating, State, createEmptyCard, type Card as FSRSCard } from 'ts-fsrs';
import { Notice, TFile, type CachedMetadata } from 'obsidian';
import type { Card, Deck, DeckSettings, FSRSData, FSRSParameters, Gamification, NoteReviewData, PluginData, ReviewLog } from './types';
import { isRecord, cyrb53hex, LEGACY_DATABASE_NAME, getDocsWritten, getErrorMessage, isLikelyCorsOrNetworkErrorMessage, buildAuthenticatedUrl, sanitizeUrlForDisplay } from './constants';
import { PouchDBManager } from '../database/PouchDBManager';
import { buildBackup, type BackupContent } from './backup';

type FSRSFlashcardsPlugin = import('../plugin/main').FSRSFlashcardsPlugin;

export class DataManager {
    private plugin: FSRSFlashcardsPlugin;
    private fsrs: FSRS;
    private decks: Map<string, Deck> = new Map();
    private cards: Map<string, Card> = new Map();
    private fsrsDataStore: Record<string, FSRSData> = {};
    private noteReviews: Map<string, NoteReviewData> = new Map();
    private reviewHistory: ReviewLog[] = [];
    private pouchDB: PouchDBManager | null = null;
    private migrationCompleted: boolean = false;
    private isLoaded: boolean = false;
    private fileMtimes: Map<string, number> = new Map();
    private lineStartsCache: { content: string; starts: number[] } | null = null;
    private firstReviewAt: Map<string, number> | null = null;
    private undoStack: Array<{ card: Card; previous: FSRSData | undefined; timestamp: number; gamification: Gamification }> = [];

    constructor(plugin: FSRSFlashcardsPlugin) {
        this.plugin = plugin;
        this.fsrs = new FSRS(plugin.settings.fsrsParams);
        if (plugin.settings.usePouchDB) {
            this.pouchDB = new PouchDBManager(this.databaseName());
        }
    }

    private runInBackground(task: () => Promise<unknown> | undefined, message: string): void {
        void (async () => {
            try {
                await task();
            } catch (error: unknown) {
                console.error(message, error);
            }
        })();
    }

    private databaseName(): string {
        return this.plugin.settings.databaseName || LEGACY_DATABASE_NAME;
    }

    getPouchDB(): PouchDBManager | null {
        return this.pouchDB;
    }

    async initializeSync() {
        if (this.pouchDB) {
            await this.pouchDB.sanitizeSyncMeta();
        }

        if (this.plugin.settings.syncEnabled
            && this.plugin.settings.syncUrl
            && this.pouchDB) {
            try {
                const syncUrl = buildAuthenticatedUrl(
                    this.plugin.settings.syncUrl,
                    this.plugin.settings.syncDbName,
                    this.plugin.settings.syncUsername,
                    this.plugin.settings.syncPassword,
                );
                console.debug('Initializing sync with:', sanitizeUrlForDisplay(syncUrl));

                this.pouchDB.onSyncChange((info) => {
                    const docsWritten = getDocsWritten(info);
                    console.debug('Synced changes:', info);
                    if (docsWritten > 0) {
                        new Notice(`Synced ${docsWritten} changes`, 2000);
                    }
                });

                this.pouchDB.onSyncError((err) => {
                    const message = getErrorMessage(err);
                    console.error('Sync error:', err);
                    new Notice(`Sync error: ${message}`, 5000);

                    if (isLikelyCorsOrNetworkErrorMessage(message)) {
                        new Notice('Sync stopped. Check cors settings and sync URL.', 7000);
                        this.runInBackground(() => this.pouchDB?.stopSync(), 'Failed to stop sync after network/CORS error:');
                    }
                });

                this.pouchDB.onSyncActive(() => {
                    console.debug('Sync active');
                });

                this.pouchDB.onSyncPaused((err) => {
                    if (err) {
                        console.debug('Sync paused with error:', err);
                    }
                });

                await this.pouchDB.setupSync(syncUrl);
                new Notice('Sync initialized successfully');
            } catch (error) {
                console.error('Failed to initialize sync:', error);
                new Notice(`Sync initialization failed: ${getErrorMessage(error)}`);
            }
        }
    }

    async stopSync() {
        if (this.pouchDB) {
            await this.pouchDB.stopSync();
        }
    }

    async load() {
        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            await this.loadFromPouchDB();
        } else {
            await this.loadFromLegacyJSON();
        }
        await this.buildIndex();
        this.isLoaded = true;
    }

    isDataLoaded() {
        return this.isLoaded;
    }

    private async loadFromPouchDB() {
        if (!this.pouchDB) return;

        console.debug('Loading data from PouchDB...');

        this.fsrsDataStore = await this.pouchDB.getAllCardStates();

        this.reviewHistory = (await this.pouchDB.getReviewHistory()).reverse();
        this.firstReviewAt = null;

        console.debug(`Loaded ${Object.keys(this.fsrsDataStore).length} cards and ${this.reviewHistory.length} reviews from PouchDB`);
    }

    private async loadFromLegacyJSON() {
        console.debug('Loading data from legacy JSON...');
        const data = (await this.plugin.loadData()) as PluginData | null;
        const cardData = data?.cardData || {};
        for (const cardId in cardData) {
            const card = cardData[cardId];
            if (card.due) card.due = new Date(card.due);
            if (card.last_review) card.last_review = new Date(card.last_review);
        }
        this.fsrsDataStore = cardData;
        this.reviewHistory = data?.reviewHistory || [];
        this.firstReviewAt = null;
    }

    async save() {
        await this.plugin.saveData({
            settings: this.plugin.settings,
            cardData: this.plugin.settings.usePouchDB ? {} : this.fsrsDataStore,
            reviewHistory: this.plugin.settings.usePouchDB ? [] : this.reviewHistory,
        });
    }

    exportBackup(): string {
        return buildBackup(this.fsrsDataStore, this.reviewHistory, this.plugin.settings.gamification, this.plugin.manifest?.version ?? '');
    }

    async importBackup(content: BackupContent): Promise<{ cards: number; matched: number; reviews: number; skipped: number }> {
        const states: Array<{ cardId: string; deckId: string; filePath: string; fsrs: FSRSData }> = [];
        let matched = 0;
        for (const [cardId, data] of Object.entries(content.cardData)) {
            const existing = this.fsrsDataStore[cardId];
            const incoming = data.last_review?.getTime() ?? 0;
            if (existing && (existing.last_review?.getTime() ?? 0) >= incoming) continue;
            this.fsrsDataStore[cardId] = data;
            const card = this.cards.get(cardId);
            if (card) {
                card.fsrsData = data;
                matched++;
            }
            states.push({ cardId, deckId: card?.deckId ?? '', filePath: card?.filePath ?? '', fsrs: data });
        }

        const known = new Set(this.reviewHistory.map(log => `${log.cardId}|${log.timestamp}`));
        const logs = content.reviewHistory.filter(log => !known.has(`${log.cardId}|${log.timestamp}`));
        if (logs.length > 0) {
            this.reviewHistory = [...this.reviewHistory, ...logs].sort((a, b) => a.timestamp - b.timestamp);
            this.firstReviewAt = null;
        }

        const g = content.gamification;
        if (g && g.totalCardsReviewed > this.plugin.settings.gamification.totalCardsReviewed) {
            Object.assign(this.plugin.settings.gamification, g);
        }

        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            await this.pouchDB.importData(states, logs);
        }
        await this.save();
        this.recalculateAllDeckStats();
        return { cards: states.length, matched, reviews: logs.length, skipped: content.skipped };
    }

    updateFsrsParameters(params: FSRSParameters) {
        this.fsrs = new FSRS(params);
    }

    async buildIndex() {
        console.debug('FSRS: Building index...');
        this.decks.clear();
        this.cards.clear();
        this.noteReviews.clear();
        this.fileMtimes.clear();
        for (const file of this.plugin.app.vault.getMarkdownFiles()) {
            await this.updateFile(file);
        }
        this.recalculateAllDeckStats();
        console.debug(`FSRS: Index complete. Found ${this.decks.size} decks and ${this.cards.size} cards.`);
    }

    getDeckId(path: string): string {
        return cyrb53hex(path);
    }

    private hasTag(cache: CachedMetadata | null | undefined, tagWithHash: string): boolean {
        if (!cache) return false;
        const normalized = tagWithHash.toLowerCase();
        const bareTag = normalized.startsWith('#') ? normalized.slice(1) : normalized;
        const hashTag = '#' + bareTag;

        const frontmatter = isRecord(cache.frontmatter) ? cache.frontmatter : null;
        if (frontmatter) {
            const fmTags = frontmatter.tags ?? frontmatter.tag;
            if (typeof fmTags === 'string') {
                const trimmed = fmTags.toLowerCase().trim();
                if (trimmed === bareTag || trimmed === hashTag) return true;
                if (trimmed.includes(',')) {
                    const parts = trimmed.split(',');
                    for (let i = 0; i < parts.length; i++) {
                        const p = parts[i].trim();
                        if (p === bareTag || p === hashTag) return true;
                    }
                }
            } else if (Array.isArray(fmTags)) {
                for (let i = 0; i < fmTags.length; i++) {
                    const item: unknown = fmTags[i];
                    if (typeof item === 'string') {
                        const trimmed = item.toLowerCase().trim();
                        if (trimmed === bareTag || trimmed === hashTag) return true;
                    }
                }
            }
        }

        if (cache.tags) {
            for (let i = 0; i < cache.tags.length; i++) {
                const t = cache.tags[i].tag.toLowerCase();
                if (t === hashTag || t === bareTag) return true;
            }
        }

        return false;
    }

    private buildHeadingBreadcrumbs(lines: string[]): (string | undefined)[] {
        const breadcrumbs = new Array<string | undefined>(lines.length);
        const headingStack: string[] = [];
        let inFrontmatter = false;
        let inCodeBlock = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (i === 0 && trimmed === '---') {
                inFrontmatter = true;
                breadcrumbs[i] = undefined;
                continue;
            }
            if (inFrontmatter) {
                if (trimmed === '---') {
                    inFrontmatter = false;
                }
                breadcrumbs[i] = undefined;
                continue;
            }

            if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
                inCodeBlock = !inCodeBlock;
                breadcrumbs[i] = headingStack.length > 0 ? headingStack.join(' > ') : undefined;
                continue;
            }

            if (!inCodeBlock) {
                const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
                if (headingMatch) {
                    const level = headingMatch[1].length;
                    const text = headingMatch[2].trim();
                    while (headingStack.length >= level) {
                        headingStack.pop();
                    }
                    headingStack.push(text);
                }
            }

            breadcrumbs[i] = headingStack.length > 0 ? headingStack.join(' > ') : undefined;
        }

        return breadcrumbs;
    }

    private findCardContext(content: string, breadcrumbs: (string | undefined)[], searchText: string): string | undefined {
        const idx = content.indexOf(searchText);
        if (idx < 0) return undefined;
        if (this.lineStartsCache?.content !== content) {
            const starts = [0];
            for (let i = content.indexOf('\n'); i >= 0; i = content.indexOf('\n', i + 1)) starts.push(i + 1);
            this.lineStartsCache = { content, starts };
        }
        const starts = this.lineStartsCache.starts;
        let lo = 0;
        let hi = starts.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (starts[mid] <= idx) lo = mid; else hi = mid - 1;
        }
        return lo < breadcrumbs.length ? breadcrumbs[lo] : undefined;
    }

    async updateFile(file: TFile): Promise<boolean> {
        const deckId = this.getDeckId(file.path);
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        const deckTag = `#${this.plugin.settings.deckTag}`;
        const reviewTag = '#review';

        const isDeck = this.hasTag(cache, deckTag);
        const isReview = this.hasTag(cache, reviewTag);

        const hadDeck = this.decks.has(deckId);
        const hadReview = this.noteReviews.has(file.path);

        if (!isDeck && !isReview) {
            if (!hadDeck && !hadReview) {
                return false;
            }
            if (hadDeck) this.removeDeck(deckId, false);
            if (hadReview) this.noteReviews.delete(file.path);
            this.fileMtimes.delete(file.path);
            return true;
        }

        const currentMtime = file.stat?.mtime ?? 0;
        const previousMtime = this.fileMtimes.get(file.path);
        if (currentMtime > 0 && previousMtime === currentMtime && (hadDeck === isDeck) && (hadReview === isReview)) {
            return false;
        }

        let stateChanged = false;

        if (isDeck) {
            this.dropDeckCards(deckId);
            const frontmatter = isRecord(cache?.frontmatter) ? cache.frontmatter : null;
            const title = frontmatter && typeof frontmatter.title === 'string' ? frontmatter.title : file.basename;
            const settings = this.parseDeckSettings(frontmatter);
            const newDeck: Deck = { id: deckId, title, filePath: file.path, cardIds: new Set(), stats: { new: 0, due: 0, learning: 0 }, settings };
            const content = await this.plugin.app.vault.read(file);
            const lines = content.split('\n');
            const breadcrumbs = this.buildHeadingBreadcrumbs(lines);

            const inBasicCard = this.parseBasicCards(content, lines, breadcrumbs, file.path, deckId, newDeck);
            this.parseSingleLineCards(lines, breadcrumbs, file.path, deckId, newDeck, inBasicCard);
            this.parseClozeCards(content, lines, breadcrumbs, file.path, deckId, newDeck, inBasicCard);

            if (newDeck.cardIds.size > 0) this.decks.set(deckId, newDeck);
            stateChanged = true;
        } else if (hadDeck) {
            this.removeDeck(deckId, false);
            stateChanged = true;
        }

        if (isReview) {
            const existing = this.noteReviews.get(file.path);
            this.noteReviews.set(file.path, {
                filePath: file.path,
                fsrsData: existing?.fsrsData || this.fsrsDataStore[`note::${file.path}`],
            });
            if (!hadReview) stateChanged = true;
        } else if (hadReview) {
            this.noteReviews.delete(file.path);
            stateChanged = true;
        }

        if (currentMtime > 0) {
            this.fileMtimes.set(file.path, currentMtime);
        } else {
            this.fileMtimes.delete(file.path);
        }

        return stateChanged;
    }

    public isFileDeck(file: TFile): boolean {
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        return this.hasTag(cache, `#${this.plugin.settings.deckTag}`);
    }

    public async ensureDeckTag(file: TFile): Promise<boolean> {
        if (this.isFileDeck(file)) return false;

        const deckTagName = this.plugin.settings.deckTag.replace(/^#/, '');
        if (this.plugin.app.fileManager?.processFrontMatter) {
            await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
                const currentTags = fm.tags;
                if (Array.isArray(currentTags)) {
                    if (!currentTags.includes(deckTagName)) {
                        currentTags.push(deckTagName);
                    }
                } else if (typeof currentTags === 'string') {
                    fm.tags = [currentTags, deckTagName];
                } else {
                    fm.tags = [deckTagName];
                }
            });
        }
        new Notice(`Tagged note as #${deckTagName} deck`);
        return true;
    }

    private parseDeckSettings(frontmatter: Record<string, unknown> | null): DeckSettings | undefined {
        if (!frontmatter) return undefined;

        let newCardsPerDay: number | undefined;
        let reviewsPerDay: number | undefined;
        let requestRetention: number | undefined;

        const rawNew = frontmatter.newCardsPerDay ?? frontmatter['new-cards-per-day'] ?? frontmatter.new_cards_per_day ?? frontmatter.newLimit;
        if (typeof rawNew === 'number' && rawNew >= 0) {
            newCardsPerDay = rawNew;
        } else if (typeof rawNew === 'string') {
            const parsed = parseInt(rawNew, 10);
            if (!isNaN(parsed) && parsed >= 0) newCardsPerDay = parsed;
        }

        const rawReviews = frontmatter.reviewsPerDay ?? frontmatter['reviews-per-day'] ?? frontmatter.reviews_per_day ?? frontmatter.reviewLimit;
        if (typeof rawReviews === 'number' && rawReviews >= 0) {
            reviewsPerDay = rawReviews;
        } else if (typeof rawReviews === 'string') {
            const parsed = parseInt(rawReviews, 10);
            if (!isNaN(parsed) && parsed >= 0) reviewsPerDay = parsed;
        }

        const rawRetention = frontmatter.requestRetention ?? frontmatter['request-retention'] ?? frontmatter.request_retention ?? frontmatter.retention ?? frontmatter['fsrs-retention'];
        if (typeof rawRetention === 'number' && rawRetention > 0 && rawRetention < 1) {
            requestRetention = rawRetention;
        } else if (typeof rawRetention === 'string') {
            const parsed = parseFloat(rawRetention);
            if (!isNaN(parsed) && parsed > 0 && parsed < 1) requestRetention = parsed;
        }

        if (newCardsPerDay === undefined && reviewsPerDay === undefined && requestRetention === undefined) {
            return undefined;
        }

        return { newCardsPerDay, reviewsPerDay, requestRetention };
    }

    private getFsrsForCard(card?: Card): FSRS {
        if (!card) return this.fsrs;
        const deck = this.decks.get(card.deckId);
        const retention = deck?.settings?.requestRetention;
        if (retention !== undefined && retention !== this.plugin.settings.fsrsParams.request_retention) {
            return new FSRS({
                ...this.plugin.settings.fsrsParams,
                request_retention: retention,
            });
        }
        return this.fsrs;
    }

    private parseSingleLineCards(lines: string[], breadcrumbs: (string | undefined)[], filePath: string, deckId: string, newDeck: Deck, inBasicCard?: boolean[]) {
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            if (inBasicCard && inBasicCard[lineIdx]) continue;
            const line = lines[lineIdx];
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Skip lines that are part of card delimiters
            if (trimmed.startsWith('---card---') || trimmed.startsWith('---end---') || trimmed.startsWith('---card-end---') || trimmed === '---') continue;

            // Skip lines that contain cloze syntax (==c#::)
            if (/==c\d+::/.test(trimmed)) continue;

            // Extract optional block ID from end of line: ^identifier
            const blockIdMatch = trimmed.match(/\s+\^([a-zA-Z0-9-]+)\s*$/);
            const blockId = blockIdMatch ? blockIdMatch[1] : null;
            let cardText = blockIdMatch ? trimmed.slice(0, blockIdMatch.index).trim() : trimmed;

            // Detect ?type flag and strip it
            const isTypeIn = /\?type\b/.test(cardText);
            cardText = cardText.replace(/\?type\b\s*/g, '').trim();

            // Reversed single-line: Q:::A
            const reversedMatch = cardText.match(/^([^:].*?):::(.*)$/);
            if (reversedMatch) {
                const front = reversedMatch[1].trim();
                const back = reversedMatch[2].trim();
                if (!front || !back) continue;

                const rType = isTypeIn ? 'typein' : 'reversed';
                const cardId = blockId
                    ? `${deckId}::${blockId}`
                    : cyrb53hex(`${filePath}::${trimmed}::${rType}`);
                const card: Card = {
                    id: cardId,
                    deckId,
                    filePath,
                    type: rType,
                    originalText: trimmed,
                    front: back,
                    back: front,
                    context: breadcrumbs[lineIdx],
                    fsrsData: this.fsrsDataStore[cardId],
                };
                this.cards.set(cardId, card);
                newDeck.cardIds.add(cardId);
                continue;
            }

            // Basic single-line: Q::A
            const basicMatch = cardText.match(/^([^:].*?)::(?!:)(.*)$/);
            if (basicMatch) {
                const front = basicMatch[1].trim();
                const back = basicMatch[2].trim();
                if (!front || !back) continue;

                const bType = isTypeIn ? 'typein' : 'basic';
                const cardId = blockId
                    ? `${deckId}::${blockId}`
                    : cyrb53hex(`${filePath}::${trimmed}`);
                const card: Card = {
                    id: cardId,
                    deckId,
                    filePath,
                    type: bType,
                    originalText: trimmed,
                    front,
                    back,
                    context: breadcrumbs[lineIdx],
                    fsrsData: this.fsrsDataStore[cardId],
                };
                this.cards.set(cardId, card);
                newDeck.cardIds.add(cardId);
            }
        }
    }

    private parseBasicCards(content: string, lines: string[], breadcrumbs: (string | undefined)[], filePath: string, deckId: string, newDeck: Deck): boolean[] {
        const inBasicCard = new Array<boolean>(lines.length).fill(false);
        const cardBlocks: Array<{ startLine: number; endLine: number; lines: string[] }> = [];

        let currentStart = -1;
        let currentCardLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (/^---\s*card\s*---/i.test(trimmed)) {
                if (currentStart !== -1) {
                    cardBlocks.push({ startLine: currentStart, endLine: i - 1, lines: currentCardLines });
                    currentCardLines = [];
                }
                currentStart = i;
                inBasicCard[i] = true;
                currentCardLines.push(line);
            } else if (currentStart !== -1) {
                inBasicCard[i] = true;
                currentCardLines.push(line);
                if (/^---\s*(?:end|card-end)\s*---$/i.test(trimmed)) {
                    cardBlocks.push({ startLine: currentStart, endLine: i, lines: currentCardLines });
                    currentStart = -1;
                    currentCardLines = [];
                }
            }
        }
        if (currentStart !== -1 && currentCardLines.length > 0) {
            cardBlocks.push({ startLine: currentStart, endLine: lines.length - 1, lines: currentCardLines });
        }

        for (const block of cardBlocks) {
            const blockText = block.lines.join('\n');
            const match = blockText.match(/^[ \t]*---\s*card\s*---[ \t]*(.*)$/im);
            if (!match) continue;

            const afterCardHeader = match[1].trim();
            const restOfBlock = blockText.slice(match.index! + match[0].length);
            const cardBody = afterCardHeader ? (afterCardHeader + '\n' + restOfBlock) : restOfBlock;

            const dividerMatch = cardBody.match(/(?:^|\r?\n)[ \t]*---[ \t]*(?:\r?\n|$)/);
            if (!dividerMatch || dividerMatch.index === undefined) continue;

            const frontPart = cardBody.slice(0, dividerMatch.index);
            let backPart = cardBody.slice(dividerMatch.index + dividerMatch[0].length);

            const endMatch = backPart.match(/(?:^|\r?\n)[ \t]*---\s*(?:end|card-end)\s*---[ \t]*(?:\r?\n|$)/i);
            if (endMatch && endMatch.index !== undefined) {
                backPart = backPart.slice(0, endMatch.index);
            }

            const isTypeIn = /\?type\b/.test(frontPart);
            const cleanFront = frontPart.replace(/\?type\b\s*/g, '').trim();

            const blockIdMatch = cleanFront.match(/\^([a-zA-Z0-9-]+)\s*$/m);
            let cardId: string;
            let front = cleanFront.trim();

            if (blockIdMatch) {
                cardId = `${deckId}::${blockIdMatch[1]}`;
                front = cleanFront.replace(/\^([a-zA-Z0-9-]+)\s*$/m, '').trim();
            } else {
                cardId = cyrb53hex(filePath + '::' + front);
            }

            const back = backPart.trim();
            if (!front || !back) continue;

            const context = breadcrumbs[block.startLine] ?? this.findCardContext(content, breadcrumbs, blockText);

            const card: Card = {
                id: cardId,
                deckId,
                filePath,
                type: isTypeIn ? 'typein' : 'basic',
                originalText: blockText,
                front,
                back,
                context,
                fsrsData: this.fsrsDataStore[cardId],
            };
            this.cards.set(cardId, card);
            newDeck.cardIds.add(cardId);
        }

        return inBasicCard;
    }

    private parseClozeCards(content: string, lines: string[], breadcrumbs: (string | undefined)[], filePath: string, deckId: string, newDeck: Deck, inBasicCard?: boolean[]) {
        const nonBasicParagraphs: Array<{ text: string; startLine: number }> = [];
        let curParaLines: string[] = [];
        let curParaStart = -1;

        for (let i = 0; i < lines.length; i++) {
            if (inBasicCard && inBasicCard[i]) {
                if (curParaLines.length > 0) {
                    nonBasicParagraphs.push({ text: curParaLines.join('\n'), startLine: curParaStart });
                    curParaLines = [];
                    curParaStart = -1;
                }
                continue;
            }
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || /^---\s*(?:end|card-end|card)\s*---$/i.test(trimmed) || trimmed === '---') {
                if (curParaLines.length > 0) {
                    nonBasicParagraphs.push({ text: curParaLines.join('\n'), startLine: curParaStart });
                    curParaLines = [];
                    curParaStart = -1;
                }
            } else {
                if (curParaLines.length === 0) curParaStart = i;
                curParaLines.push(line);
            }
        }
        if (curParaLines.length > 0) {
            nonBasicParagraphs.push({ text: curParaLines.join('\n'), startLine: curParaStart });
        }

        for (const { text: paragraph, startLine } of nonBasicParagraphs) {
            const clozeRegex = /==c(\d+)::(.*?)==/gs;
            const clozes = [...paragraph.matchAll(clozeRegex)];

            if (clozes.length === 0) continue;

            const blockIdMatch = paragraph.match(/\^([a-zA-Z0-9-]+)\s*$/);
            const context = breadcrumbs[startLine] ?? this.findCardContext(content, breadcrumbs, paragraph);

            // Deduplicate cloze numbers (e.g. multiple ==c1::...== share the same card)
            const clozeNumbers = [...new Set(clozes.map(m => m[1]))];

            clozeNumbers.forEach(clozeNum => {
                let cardId: string;
                if (blockIdMatch) {
                    cardId = `${deckId}::${blockIdMatch[1]}-${clozeNum}`;
                } else {
                    cardId = cyrb53hex(`${filePath}::${paragraph}::${clozeNum}`);
                }

                const front = paragraph.replace(/==c(\d+)::(.*?)==/gs, (_match: string, num: string, body: string): string => {
                    const colonIdx = body.indexOf('::');
                    const answer = colonIdx !== -1 ? body.slice(0, colonIdx) : body;
                    const hint = colonIdx !== -1 ? body.slice(colonIdx + 2) : '';
                    if (num === clozeNum) {
                        return hint ? `[${hint}]` : '[...]';
                    }
                    return answer;
                }).trim();

                const back = paragraph.replace(/==c\d+::(.*?)==/gs, (_match: string, body: string): string => {
                    const colonIdx = body.indexOf('::');
                    return colonIdx !== -1 ? body.slice(0, colonIdx) : body;
                }).trim();

                const card: Card = {
                    id: cardId,
                    deckId,
                    filePath,
                    type: 'cloze',
                    originalText: paragraph,
                    front,
                    back,
                    context,
                    fsrsData: this.fsrsDataStore[cardId],
                };
                this.cards.set(cardId, card);
                newDeck.cardIds.add(cardId);
            });
        }
    }

    private dropDeckCards(deckId: string) {
        const deck = this.decks.get(deckId);
        if (!deck) return;
        deck.cardIds.forEach(cardId => this.cards.delete(cardId));
        this.decks.delete(deckId);
    }

    removeDeck(deckId: string, fullDelete: boolean = true) {
        const deck = this.decks.get(deckId);
        if (deck) {
            this.fileMtimes.delete(deck.filePath);
            deck.cardIds.forEach(cardId => {
                this.cards.delete(cardId);
                delete this.fsrsDataStore[cardId];
            });
            this.decks.delete(deckId);
            if (fullDelete) void this.save();
        }
    }

    private collectCardIds(content: string, filePath: string): string[] {
        const deckId = this.getDeckId(filePath);
        const scratch: Deck = { id: deckId, title: '', filePath, cardIds: new Set(), stats: { new: 0, due: 0, learning: 0 } };
        const lines = content.split('\n');
        const breadcrumbs = this.buildHeadingBreadcrumbs(lines);

        const realCards = this.cards;
        this.cards = new Map();
        try {
            const inBasicCard = this.parseBasicCards(content, lines, breadcrumbs, filePath, deckId, scratch);
            this.parseSingleLineCards(lines, breadcrumbs, filePath, deckId, scratch, inBasicCard);
            this.parseClozeCards(content, lines, breadcrumbs, filePath, deckId, scratch, inBasicCard);
        } finally {
            this.cards = realCards;
        }
        return Array.from(scratch.cardIds);
    }

    private async rekeyRenamedFile(file: TFile, oldPath: string) {
        const renames: Array<{ oldId: string; newId: string; deckId: string; filePath: string }> = [];

        if (this.decks.has(this.getDeckId(oldPath))) {
            const content = await this.plugin.app.vault.read(file);
            const oldIds = this.collectCardIds(content, oldPath);
            const newIds = this.collectCardIds(content, file.path);
            const newDeckId = this.getDeckId(file.path);
            oldIds.forEach((oldId, i) => {
                const newId = newIds[i];
                if (!newId || newId === oldId || !this.fsrsDataStore[oldId] || this.fsrsDataStore[newId]) return;
                renames.push({ oldId, newId, deckId: newDeckId, filePath: file.path });
            });
        }

        const oldNoteKey = `note::${oldPath}`;
        const newNoteKey = `note::${file.path}`;
        if (this.noteReviews.delete(oldPath) && this.fsrsDataStore[oldNoteKey] && !this.fsrsDataStore[newNoteKey]) {
            renames.push({ oldId: oldNoteKey, newId: newNoteKey, deckId: '', filePath: file.path });
        }
        if (renames.length === 0) return;

        const idMap = new Map<string, string>();
        for (const { oldId, newId } of renames) {
            this.fsrsDataStore[newId] = this.fsrsDataStore[oldId];
            delete this.fsrsDataStore[oldId];
            idMap.set(oldId, newId);
        }
        for (const log of this.reviewHistory) {
            const newId = idMap.get(log.cardId);
            if (newId) log.cardId = newId;
        }
        this.firstReviewAt = null;

        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            await this.pouchDB.rekeyCards(renames);
        }
    }

    async renameDeck(file: TFile, oldPath: string) {
        const oldDeckId = this.getDeckId(oldPath);
        await this.rekeyRenamedFile(file, oldPath);
        this.removeDeck(oldDeckId, false);
        this.fileMtimes.delete(oldPath);
        await this.updateFile(file);
        await this.save();
    }

    recalculateAllDeckStats() {
        const now = new Date();
        for (const deck of this.decks.values()) {
            deck.stats = { new: 0, due: 0, learning: 0 };
            for (const cardId of deck.cardIds) {
                const card = this.cards.get(cardId);
                if (!card || card.deckId !== deck.id) continue;

                const fsrsData = this.fsrsDataStore[cardId];
                if (!fsrsData || fsrsData.state === State.New) {
                    deck.stats.new++;
                } else {
                    if (fsrsData.state === State.Learning || fsrsData.state === State.Relearning) deck.stats.learning++;
                    if (fsrsData.due <= now) deck.stats.due++;
                }
            }
        }
    }

    getDecks(): Deck[] {
        return Array.from(this.decks.values()).sort((a, b) => a.title.localeCompare(b.title));
    }

    getAllCards(): Card[] {
        return Array.from(this.cards.values());
    }

    getReviewHistory(): ReviewLog[] {
        return this.reviewHistory;
    }

    getCardsByDeck(deckId: string): Card[] {
        const deck = this.decks.get(deckId);
        if (!deck) return [];
        return Array.from(deck.cardIds)
            .map(id => this.cards.get(id))
            .filter((card): card is Card => {
                return card !== undefined && card !== null && card.deckId === deckId;
            });
    }

    private getTodayLogs(): ReviewLog[] {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const start = todayStart.getTime();
        let i = this.reviewHistory.length;
        while (i > 0 && this.reviewHistory[i - 1].timestamp >= start) i--;
        return this.reviewHistory.slice(i);
    }

    private getFirstReviewAt(): Map<string, number> {
        if (!this.firstReviewAt) {
            const map = new Map<string, number>();
            for (const log of this.reviewHistory) {
                const seen = map.get(log.cardId);
                if (seen === undefined || log.timestamp < seen) map.set(log.cardId, log.timestamp);
            }
            this.firstReviewAt = map;
        }
        return this.firstReviewAt;
    }

    private getReviewedTodayCount(deckId: string): number {
        let count = 0;
        for (const log of this.getTodayLogs()) {
            if (this.cards.get(log.cardId)?.deckId === deckId) count++;
        }
        return count;
    }

    areSiblings(cardA: Card, cardB: Card): boolean {
        if (cardA.id === cardB.id) return false;
        if (cardA.filePath !== cardB.filePath) return false;

        if (cardA.originalText && cardB.originalText && cardA.originalText === cardB.originalText) {
            return true;
        }

        if (cardA.id.includes('::') && cardB.id.includes('::')) {
            const baseA = cardA.id.replace(/-\d+$/, '');
            const baseB = cardB.id.replace(/-\d+$/, '');
            if (baseA === baseB) return true;
        }

        return false;
    }

    isLeech(card: Card): boolean {
        const threshold = this.plugin.settings.leechThreshold ?? 8;
        if (threshold <= 0) return false;
        return (card.fsrsData?.lapses ?? 0) >= threshold;
    }

    getReviewQueue(deckId: string): Card[] {
        const deck = this.decks.get(deckId);
        if (!deck) return [];
        const now = new Date();
        const allCards = Array.from(deck.cardIds)
            .map(id => this.cards.get(id))
            .filter((card): card is Card => card !== undefined && card !== null && card.deckId === deckId);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const firstReviewAt = this.getFirstReviewAt();

        const newIntroducedToday = allCards.filter(c => {
            const first = firstReviewAt.get(c.id);
            return first !== undefined && first >= todayStart.getTime();
        }).length;

        const dueCards = allCards.filter(c =>
            c.fsrsData && c.fsrsData.state !== State.New && c.fsrsData.due <= now
        )
            .sort((a, b) => a.fsrsData!.due.getTime() - b.fsrsData!.due.getTime());

        const newCards = allCards.filter(c =>
            !c.fsrsData || c.fsrsData.state === State.New
        );

        const deckMaxReviews = deck.settings?.reviewsPerDay ?? this.plugin.settings.reviewsPerDay;
        const deckMaxNew = deck.settings?.newCardsPerDay ?? this.plugin.settings.newCardsPerDay;

        const reviewsRemaining = Math.max(0, deckMaxReviews - this.getReviewedTodayCount(deckId));
        const newCardsRemaining = Math.max(0, deckMaxNew - newIntroducedToday);

        const candidateCards = [
            ...dueCards.slice(0, reviewsRemaining),
            ...newCards.slice(0, newCardsRemaining),
        ];

        if (!this.plugin.settings.burySiblings) {
            return candidateCards;
        }

        const reviewedTodayLogs = this.getTodayLogs();
        const reviewedTodayCards = reviewedTodayLogs
            .map(l => this.cards.get(l.cardId))
            .filter((c): c is Card => c !== undefined);

        const finalQueue: Card[] = [];
        for (const card of candidateCards) {
            const hasReviewedSibling = reviewedTodayCards.some(s => this.areSiblings(card, s));
            if (hasReviewedSibling) continue;

            const hasQueueSibling = finalQueue.some(q => this.areSiblings(card, q));
            if (hasQueueSibling) continue;

            finalQueue.push(card);
        }

        return finalQueue;
    }

    getAllCardsForStudy(deckId: string): Card[] {
        const deck = this.decks.get(deckId);
        if (!deck) return [];
        const now = new Date();
        const allCards = Array.from(deck.cardIds)
            .map(id => this.cards.get(id))
            .filter((card): card is Card => card !== undefined && card !== null && card.deckId === deckId);
        const dueCards = allCards.filter(c =>
            c.fsrsData && c.fsrsData.state !== State.New && c.fsrsData.due <= now
        ).sort((a, b) => a.fsrsData!.due.getTime() - b.fsrsData!.due.getTime());
        const newCards = allCards.filter(c => !c.fsrsData || c.fsrsData.state === State.New);
        return [...dueCards, ...newCards];
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    undoLastRating(): Card | null {
        const entry = this.undoStack.pop();
        if (!entry) return null;
        const { card, previous, timestamp, gamification } = entry;

        let logIndex = -1;
        for (let i = this.reviewHistory.length - 1; i >= 0; i--) {
            if (this.reviewHistory[i].cardId === card.id && this.reviewHistory[i].timestamp === timestamp) {
                logIndex = i;
                break;
            }
        }
        if (logIndex >= 0) this.reviewHistory.splice(logIndex, 1);
        this.firstReviewAt = null;

        if (previous) {
            this.fsrsDataStore[card.id] = previous;
        } else {
            delete this.fsrsDataStore[card.id];
        }
        card.fsrsData = previous;
        const live = this.cards.get(card.id);
        if (live) live.fsrsData = previous;
        Object.assign(this.plugin.settings.gamification, gamification);

        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            const db = this.pouchDB;
            this.runInBackground(
                () => previous ? db.saveCardState(card.id, card.deckId, card.filePath, previous) : db.deleteCardState(card.id),
                'Failed to restore card state:',
            );
            this.runInBackground(() => db.deleteReviewLog(card.id, timestamp), 'Failed to remove review log:');
            void this.save();
        } else {
            void this.save();
        }
        this.recalculateAllDeckStats();
        return card;
    }

    updateCard(card: Card, rating: Rating) {
        const now = new Date();
        this.undoStack.push({
            card,
            previous: this.fsrsDataStore[card.id],
            timestamp: now.getTime(),
            gamification: { ...this.plugin.settings.gamification },
        });
        if (this.undoStack.length > 100) this.undoStack.shift();
        const fsrsCard = card.fsrsData || {
            due: now, stability: 0, difficulty: 0, elapsed_days: 0,
            scheduled_days: 0, reps: 0, lapses: 0, state: State.New, learning_steps: 0,
        };
        const fsrs = this.getFsrsForCard(card);
        const schedulingCards = fsrs.repeat(fsrsCard, now);
        const newFsrsData = schedulingCards[rating as Exclude<Rating, Rating.Manual>].card;
        this.fsrsDataStore[card.id] = newFsrsData;
        card.fsrsData = newFsrsData;

        const reviewLog: ReviewLog = { cardId: card.id, timestamp: now.getTime(), rating };
        this.reviewHistory.push(reviewLog);
        if (this.firstReviewAt && !this.firstReviewAt.has(card.id)) this.firstReviewAt.set(card.id, now.getTime());

        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            const db = this.pouchDB;
            this.runInBackground(() => db.saveCardState(card.id, card.deckId, card.filePath, newFsrsData), 'Failed to save card state:');
            this.runInBackground(() => db.addReviewLog(card.id, now.getTime(), rating), 'Failed to save review log:');
        } else {
            void this.save();
        }

        this.updateGamification(now, rating, newFsrsData);
    }

    private updateGamification(now: Date, rating: Rating, fsrsData: import('ts-fsrs').Card) {
        const g = this.plugin.settings.gamification;
        const today = now.toISOString().slice(0, 10);

        // Streak
        if (g.lastReviewDate) {
            const lastDate = new Date(g.lastReviewDate);
            const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                g.currentStreak++;
            } else if (diffDays > 1) {
                g.currentStreak = 1;
            }
        } else {
            g.currentStreak = 1;
        }
        g.lastReviewDate = today;
        if (g.currentStreak > g.longestStreak) {
            g.longestStreak = g.currentStreak;
        }

        // XP: base 10 × rating multiplier × interval multiplier
        const ratingMult = rating === Rating.Again ? 1 : rating === Rating.Hard ? 2 : rating === Rating.Good ? 3 : 4;
        const intervalDays = Math.max(fsrsData.scheduled_days || 0, 1);
        const xpGained = Math.round(10 * ratingMult * Math.min(intervalDays / 7, 3));
        g.totalXp += xpGained;

        // Total cards reviewed
        g.totalCardsReviewed++;

        // Most reviews in a day
        const reviewsToday = this.getTodayLogs().length;
        if (reviewsToday > g.mostReviewsInDay) {
            g.mostReviewsInDay = reviewsToday;
        }
    }

    getGamificationStats(): Gamification {
        return { ...this.plugin.settings.gamification };
    }

    getNextReviewIntervals(card: Card): Record<number, string> {
        const now = new Date();
        const fsrsCard = card.fsrsData || {
            due: now, stability: 0, difficulty: 0, elapsed_days: 0,
            scheduled_days: 0, reps: 0, lapses: 0, state: State.New, learning_steps: 0,
        };
        const fsrs = this.getFsrsForCard(card);
        const schedulingCards = fsrs.repeat(fsrsCard, now);
        const formatInterval = (days: number): string => {
            if (days < 1) return '<1d';
            if (days < 30) return `${Math.round(days)}d`;
            if (days < 365) return `${(days / 30).toFixed(1)}m`;
            return `${(days / 365).toFixed(1)}y`;
        };
        return {
            [Rating.Again]: formatInterval(schedulingCards[Rating.Again].card.scheduled_days),
            [Rating.Hard]: formatInterval(schedulingCards[Rating.Hard].card.scheduled_days),
            [Rating.Good]: formatInterval(schedulingCards[Rating.Good].card.scheduled_days),
            [Rating.Easy]: formatInterval(schedulingCards[Rating.Easy].card.scheduled_days),
        };
    }

    getStats() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const reviewsToday = this.reviewHistory.filter((log) => log.timestamp >= todayStart);
        const activity: number[] = Array.from({ length: 30 }, () => 0);

        this.reviewHistory.forEach((log) => {
            const daysAgo = Math.floor((now.getTime() - log.timestamp) / (1000 * 60 * 60 * 24));
            if (daysAgo < 30) {
                activity[29 - daysAgo]++;
            }
        });

        const forecast: number[] = Array.from({ length: 7 }, () => 0);
        let mature = 0;
        let learning = 0;
        let young = 0;
        let total = 0;

        for (const card of this.cards.values()) {
            const data = this.fsrsDataStore[card.id];
            if (!data) {
                continue;
            }

            total++;

            const dueDay = new Date(data.due.getFullYear(), data.due.getMonth(), data.due.getDate()).getTime();
            const daysForward = Math.max(0, Math.round((dueDay - todayStart) / (1000 * 60 * 60 * 24)));
            if (daysForward < 7) {
                forecast[daysForward]++;
            }

            if (data.stability >= 21) {
                mature++;
            } else if (data.state === State.Review) {
                young++;
            } else {
                learning++;
            }
        }

        return {
            reviewsToday: reviewsToday.length,
            activity,
            forecast,
            maturity: {
                mature,
                young,
                learning,
                new: this.cards.size - total,
            },
        };
    }

    getDetailedStats(): {
        reviewsToday: number;
        activity: number[];
        forecast: number[];
        maturity: { mature: number; young: number; learning: number; new: number };
        retentionCurve: { date: string; predicted: number; actual: number }[];
        heatmapData: { date: string; count: number }[];
        intervalBuckets: { label: string; count: number }[];
        perDeckStats: { name: string; new: number; due: number; learning: number }[];
    } {
        const base = this.getStats();
        const now = new Date();

        // Retention curve: replay review sequences to compute predicted R vs actual recall
        const dailyBuckets = new Map<string, { predictedSum: number; actualSum: number; count: number }>();
        const byCard = new Map<string, { timestamp: number; rating: Rating }[]>();
        for (const log of this.reviewHistory) {
            if (!byCard.has(log.cardId)) byCard.set(log.cardId, []);
            byCard.get(log.cardId)!.push({ timestamp: log.timestamp, rating: log.rating });
        }

        for (const reviews of byCard.values()) {
            reviews.sort((a, b) => a.timestamp - b.timestamp);
            let state: import('ts-fsrs').Card | null = null;

            for (let i = 0; i < reviews.length; i++) {
                const review = reviews[i];
                const dateKey = new Date(review.timestamp).toISOString().slice(0, 10);

                if (!dailyBuckets.has(dateKey)) {
                    dailyBuckets.set(dateKey, { predictedSum: 0, actualSum: 0, count: 0 });
                }
                const bucket = dailyBuckets.get(dateKey)!;

                if (state && i > 0) {
                    const elapsedDays = (review.timestamp - reviews[i - 1].timestamp) / (1000 * 60 * 60 * 24);
                    const stability = state.stability;
                    const predictedR = Math.pow(1 + (Math.pow(0.9, 1 / -0.5) - 1) * Math.max(elapsedDays, 0) / Math.max(stability, 0.01), -0.5);
                    bucket.predictedSum += predictedR;
                } else {
                    bucket.predictedSum += 1;
                }

                const repeatCard: FSRSCard = state ?? createEmptyCard(new Date(review.timestamp));
                const schedulingCards = this.fsrs.repeat(repeatCard, new Date(review.timestamp));
                const rating = review.rating as Exclude<Rating, Rating.Manual>;
                state = schedulingCards[rating].card;

                const actualR = review.rating >= Rating.Good ? 1 : 0;
                bucket.actualSum += actualR;
                bucket.count++;
            }
        }

        const retentionCurve: { date: string; predicted: number; actual: number }[] = [];
        const sortedDates = [...dailyBuckets.keys()].sort().slice(-60);
        for (const date of sortedDates) {
            const b = dailyBuckets.get(date)!;
            retentionCurve.push({
                date,
                predicted: +(b.predictedSum / b.count).toFixed(3),
                actual: +(b.actualSum / b.count).toFixed(3),
            });
        }

        // Heatmap data: last 365 days
        const heatmapData: { date: string; count: number }[] = [];
        const dayCounts = new Map<string, number>();
        for (const log of this.reviewHistory) {
            const date = new Date(log.timestamp).toISOString().slice(0, 10);
            dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
        }
        for (let i = 364; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const date = d.toISOString().slice(0, 10);
            heatmapData.push({ date, count: dayCounts.get(date) || 0 });
        }

        // Interval distribution
        const intervalDeltas: number[] = [];
        for (const reviews of byCard.values()) {
            reviews.sort((a, b) => a.timestamp - b.timestamp);
            for (let i = 1; i < reviews.length; i++) {
                const deltaDays = (reviews[i].timestamp - reviews[i - 1].timestamp) / (1000 * 60 * 60 * 24);
                intervalDeltas.push(deltaDays);
            }
        }

        const buckets = [
            { max: 1, label: '<1d' },
            { max: 2, label: '1d' },
            { max: 3, label: '2d' },
            { max: 4, label: '3d' },
            { max: 7, label: '4-6d' },
            { max: 14, label: '1-2w' },
            { max: 30, label: '2-4w' },
            { max: Infinity, label: '>30d' },
        ];
        const intervalBuckets = buckets.map(b => ({ label: b.label, count: 0 }));
        for (const d of intervalDeltas) {
            for (let i = 0; i < buckets.length; i++) {
                if (d < buckets[i].max) {
                    intervalBuckets[i].count++;
                    break;
                }
            }
        }

        // Per-deck stats
        const perDeckStats = this.getDecks().map(d => ({
            name: d.title,
            new: d.stats.new,
            due: d.stats.due,
            learning: d.stats.learning,
        }));

        return {
            ...base,
            retentionCurve,
            heatmapData,
            intervalBuckets,
            perDeckStats,
        };
    }

    async resetAllProgress(): Promise<void> {
        console.debug('Nuclear option: Resetting all card progress...');

        this.fsrsDataStore = {};
        this.reviewHistory = [];
        this.firstReviewAt = null;

        for (const card of this.cards.values()) {
            card.fsrsData = undefined;
        }

        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            console.debug('Clearing PouchDB card states and review logs...');
            await this.pouchDB.destroy();
            const { PouchDBManager } = await import('../database/PouchDBManager');
            this.pouchDB = new PouchDBManager(this.databaseName());
            if (this.plugin.settings.syncEnabled) {
                await this.initializeSync();
            }
        }

        await this.save();

        this.recalculateAllDeckStats();

        console.debug('All progress has been reset');
    }

    getDueNotes(): NoteReviewData[] {
        const now = new Date();
        return Array.from(this.noteReviews.values())
            .filter(n => {
                const data = n.fsrsData;
                return !data || data.state === State.New || data.due <= now;
            })
            .sort((a, b) => {
                const aDue = a.fsrsData?.due?.getTime() ?? 0;
                const bDue = b.fsrsData?.due?.getTime() ?? 0;
                return aDue - bDue;
            });
    }

    getAllReviewNotes(): NoteReviewData[] {
        return Array.from(this.noteReviews.values());
    }

    rateNote(filePath: string, rating: Rating) {
        const now = new Date();
        const existing = this.noteReviews.get(filePath);
        const fsrsCard = existing?.fsrsData || {
            due: now, stability: 0, difficulty: 0, elapsed_days: 0,
            scheduled_days: 0, reps: 0, lapses: 0, state: State.New, learning_steps: 0,
        };
        const schedulingCards = this.fsrs.repeat(fsrsCard, now);
        const newFsrsData = schedulingCards[rating as Exclude<Rating, Rating.Manual>].card;

        const noteKey = `note::${filePath}`;
        this.fsrsDataStore[noteKey] = newFsrsData;
        this.noteReviews.set(filePath, { filePath, fsrsData: newFsrsData });

        const reviewLog: ReviewLog = { cardId: noteKey, timestamp: now.getTime(), rating };
        this.reviewHistory.push(reviewLog);

        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            const db = this.pouchDB;
            this.runInBackground(() => db.saveCardState(noteKey, '', filePath, newFsrsData), 'Failed to save note review state:');
            this.runInBackground(() => db.addReviewLog(noteKey, now.getTime(), rating), 'Failed to save note review log:');
        } else {
            void this.save();
        }
    }
}
