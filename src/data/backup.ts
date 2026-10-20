import type { FSRSData, Gamification, ReviewLog } from './types';
import { isRecord } from './constants';

export const BACKUP_FORMAT = 'lemma-backup';

export interface BackupContent {
    cardData: Record<string, FSRSData>;
    reviewHistory: ReviewLog[];
    gamification?: Gamification;
    skipped: number;
}

export function buildBackup(cardData: Record<string, FSRSData>, reviewHistory: ReviewLog[], gamification: Gamification, pluginVersion: string): string {
    return JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        pluginVersion,
        cardData,
        reviewHistory,
        gamification,
    }, null, 2);
}

function toDate(value: unknown): Date | null {
    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function parseCard(raw: unknown): FSRSData | null {
    if (!isRecord(raw)) return null;
    const due = toDate(raw.due);
    if (!due) return null;
    const numeric = ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses', 'state'] as const;
    for (const key of numeric) {
        if (!isFiniteNumber(raw[key])) return null;
    }
    const lastReview = raw.last_review === undefined || raw.last_review === null ? undefined : toDate(raw.last_review);
    if (lastReview === null) return null;
    const extras = isFiniteNumber(raw.learning_steps) ? { learning_steps: raw.learning_steps } : {};
    return {
        ...extras,
        due,
        stability: raw.stability as number,
        difficulty: raw.difficulty as number,
        elapsed_days: raw.elapsed_days as number,
        scheduled_days: raw.scheduled_days as number,
        reps: raw.reps as number,
        lapses: raw.lapses as number,
        state: raw.state as number,
        last_review: lastReview,
    };
}

function parseGamification(raw: unknown): Gamification | undefined {
    if (!isRecord(raw)) return undefined;
    const keys = ['currentStreak', 'longestStreak', 'totalXp', 'mostReviewsInDay', 'totalCardsReviewed'] as const;
    if (!keys.every((k) => isFiniteNumber(raw[k])) || typeof raw.lastReviewDate !== 'string') return undefined;
    return {
        currentStreak: raw.currentStreak as number,
        longestStreak: raw.longestStreak as number,
        totalXp: raw.totalXp as number,
        mostReviewsInDay: raw.mostReviewsInDay as number,
        totalCardsReviewed: raw.totalCardsReviewed as number,
        lastReviewDate: raw.lastReviewDate,
    };
}

// Accepts a Lemma backup or a plugin data.json from any released version (same cardData/reviewHistory shape).
export function parseBackup(text: string): BackupContent {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        throw new Error('This file is not valid JSON.');
    }
    if (!isRecord(raw) || !isRecord(raw.cardData) || !Array.isArray(raw.reviewHistory)) {
        throw new Error('This file is not a Lemma backup or a Lemma data.json file.');
    }

    let skipped = 0;
    const cardData: Record<string, FSRSData> = {};
    for (const [id, value] of Object.entries(raw.cardData)) {
        const card = parseCard(value);
        if (card) cardData[id] = card; else skipped++;
    }

    const reviewHistory: ReviewLog[] = [];
    for (const entry of raw.reviewHistory as unknown[]) {
        if (isRecord(entry) && typeof entry.cardId === 'string' && isFiniteNumber(entry.timestamp)
            && isFiniteNumber(entry.rating) && entry.rating >= 1 && entry.rating <= 4) {
            reviewHistory.push({ cardId: entry.cardId, timestamp: entry.timestamp, rating: entry.rating });
        } else {
            skipped++;
        }
    }

    return { cardData, reviewHistory, gamification: parseGamification(raw.gamification), skipped };
}
