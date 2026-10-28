import { generatorParameters } from 'ts-fsrs';
import type { FSRSSettings, Card } from './types';

export const VIEW_TYPE_DASHBOARD = 'fsrs-dashboard-view';
export const LEMMA_ICON_ID = 'lemma-icon';
export const LEMMA_ICON_SVG = '<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M 38 12 H 76 A 8 8 0 0 1 84 20 V 66"/><path d="M 26 22 H 64 A 8 8 0 0 1 72 30 V 76"/><rect x="14" y="32" width="50" height="58" rx="8"/><path d="M 29 46 V 74 H 49"/></g>';
export const VIEW_ICON_NAME = LEMMA_ICON_ID;
export const STATUS_ICON_NAME = LEMMA_ICON_ID;

export const DEFAULT_SETTINGS: FSRSSettings = {
    deckTag: 'flashcards',
    newCardsPerDay: 20,
    reviewsPerDay: 200,
    fontSize: 18,
    fsrsParams: generatorParameters(),
    syncEnabled: false,
    syncUrl: '',
    syncDbName: 'lemma',
    syncUsername: '',
    syncPassword: '',
    usePouchDB: true,
    burySiblings: true,
    leechThreshold: 8,
    gamification: {
        currentStreak: 0,
        longestStreak: 0,
        lastReviewDate: '',
        totalXp: 0,
        mostReviewsInDay: 0,
        totalCardsReviewed: 0,
    },
};

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (isRecord(error) && typeof error.message === 'string') {
        return error.message;
    }
    return String(error);
}

export function getDocsWritten(info: unknown): number {
    if (!isRecord(info)) {
        return 0;
    }
    const change = info.change;
    if (!isRecord(change) || typeof change.docs_written !== 'number') {
        return 0;
    }
    return change.docs_written;
}

export function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
}

export function getDocCount(info: unknown): number {
    if (!isRecord(info) || typeof info.doc_count !== 'number') {
        return 0;
    }
    return info.doc_count;
}

export function isLikelyCorsOrNetworkErrorMessage(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('failed to fetch')
        || normalized.includes('cors')
        || normalized.includes('network');
}

export function sanitizeCredentialForUrl(value: string): string {
    return value.replace(/%(?![0-9a-fA-F]{2})/g, '%25');
}

export function sanitizeUrlForDisplay(value: string): string {
    try {
        const url = new URL(value);
        url.username = '';
        url.password = '';
        return url.toString();
    } catch {
        return value.replace(/\/\/[^/@\s]*@/, '//');
    }
}

export function usesInsecureHttp(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:') return false;
        return !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    } catch {
        return false;
    }
}

export function buildAuthenticatedUrl(url: string, dbName: string, username: string, password: string): string {
    try {
        const urlObj = new URL(url.trim());
        const cleanDbName = dbName.trim().replace(/^\/+|\/+$/g, '');
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);

        if (cleanDbName) {
            const lastSegment = pathSegments[pathSegments.length - 1];
            if (lastSegment !== cleanDbName) {
                pathSegments.push(cleanDbName);
            }
        }

        urlObj.pathname = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';

        if (username) {
            urlObj.username = sanitizeCredentialForUrl(username);
        }
        if (password) {
            urlObj.password = sanitizeCredentialForUrl(password);
        }

        return urlObj.toString();
    } catch (error) {
        console.error('Failed to build authenticated URL:', error);
        return url;
    }
}

export const LEGACY_DATABASE_NAME = 'lemma_local';

// Every vault shares one IndexedDB origin, so installs that predate per-vault names must keep
// the shared name forever; only a vault with no saved data gets a name scoped to itself.
export function resolveDatabaseName(savedName: string | undefined, hasSavedData: boolean, vaultKey: string): string {
    if (typeof savedName === 'string' && savedName.trim()) return savedName;
    if (hasSavedData) return LEGACY_DATABASE_NAME;
    return `${LEGACY_DATABASE_NAME}_${cyrb53hex(vaultKey)}`;
}

export function generateBlockId(length: number = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `fsrs-${result}`;
}

export function cyrb53hex(str: string, seed = 0): string {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return hash.toString(16).padStart(16, '0');
}

const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'tiff', 'excalidraw',
]);

export function isImageOnlyContent(content: string): boolean {
    if (!content || typeof content !== 'string') return false;

    const clean = content.replace(/\s*\^[a-zA-Z0-9-]+\s*$/, '').trim();
    if (!clean) return false;

    const wikiMatch = clean.match(/^!\[\[([^\]\r\n]+)\]\]$/);
    if (wikiMatch) {
        const rawTarget = wikiMatch[1].split('|')[0].trim().toLowerCase();
        if (rawTarget.endsWith('.excalidraw.md') || rawTarget.endsWith('.excalidraw')) {
            return true;
        }
        const ext = rawTarget.split('.').pop();
        return ext ? IMAGE_EXTENSIONS.has(ext) : false;
    }

    const mdMatch = clean.match(/^!\[([^\]\r\n]*)\]\(([^)\r\n]+)\)$/);
    if (mdMatch) {
        return true;
    }

    return false;
}

export function isInPlaceImageCard(card: Card | null | undefined): boolean {
    if (!card) return false;
    return isImageOnlyContent(card.front) && isImageOnlyContent(card.back);
}

