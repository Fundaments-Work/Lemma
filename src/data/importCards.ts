import { generateBlockId } from './constants';

export interface ImportedCard {
    front: string;
    back: string;
}

export interface CardImportResult {
    markdown: string;
    cards: number;
    skipped: number;
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };

function htmlToText(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(div|p|li)>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&(#39|[a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function clozeToLemma(value: string): string {
    return value.replace(/\{\{c(\d+)::(.*?)(?:::[^}]*)?\}\}/gs, '==c$1::$2==');
}

// RFC 4180 style parser: quoted fields may contain delimiters, doubled quotes and newlines.
export function parseDelimited(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') quoted = false;
            else field += ch;
        } else if (ch === '"' && field === '') {
            quoted = true;
        } else if (ch === delimiter) {
            row.push(field); field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some((f) => f !== '')) rows.push(row);
            row = [];
        } else {
            field += ch;
        }
    }
    row.push(field);
    if (row.some((f) => f !== '')) rows.push(row);
    return rows;
}

function detectDelimiter(text: string): string {
    const separator = text.match(/^#separator:(.+)$/m)?.[1]?.trim().toLowerCase();
    if (separator === 'tab') return '\t';
    if (separator === 'comma') return ',';
    if (separator === 'semicolon') return ';';
    if (separator === 'pipe') return '|';
    const sample = text.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).slice(0, 5).join('\n');
    const counts: Array<[string, number]> = ['\t', ';', ','].map((d) => [d, sample.split(d).length - 1]);
    counts.sort((a, b) => b[1] - a[1]);
    return counts[0][1] > 0 ? counts[0][0] : '\t';
}

function cardMarkdown(card: ImportedCard, id: string): string {
    const cloze = /==c\d+::/.test(card.front) && !card.back;
    if (cloze) return `${card.front} ^${id}`;
    const multiline = /\n/.test(card.front) || /\n/.test(card.back);
    const unsafe = card.front.includes('::') || card.back.includes('::') || /^---/m.test(card.front + card.back);
    if (!multiline && !unsafe) return `${card.front}::${card.back} ^${id}`;
    // The single-line parser also scans lines inside a block card, so "::" is split with a zero-width space.
    const safe = (v: string) => v.replace(/::/g, ':\u200B:');
    return `---card--- ^${id}\n${safe(card.front)}\n---\n${safe(card.back)}`;
}

// Accepts an Anki "Notes in Plain Text" export or a CSV/TSV file. The first column is the front and the
// second the back; further columns (tags, extra fields) are ignored. Cloze notes need only one column.
export function convertToLemma(text: string, deckTag: string, makeId: () => string = generateBlockId): CardImportResult {
    const clean = text.replace(/^\uFEFF/, '');
    const html = /^#html:true$/im.test(clean);
    const rows = parseDelimited(clean.split(/\r?\n/).filter((l) => !l.startsWith('#')).join('\n'), detectDelimiter(clean));

    const used = new Set<string>();
    const lines: string[] = [];
    const blocks: string[] = [];
    let skipped = 0;
    for (const row of rows) {
        const prepare = (v: string) => clozeToLemma(html || /<[a-z/][^>]*>/i.test(v) ? htmlToText(v) : v.trim());
        const front = prepare(row[0] ?? '');
        const back = prepare(row[1] ?? '');
        const isCloze = /==c\d+::/.test(front);
        if (!front || (!back && !isCloze)) { skipped++; continue; }
        let id = makeId();
        while (used.has(id)) id = makeId();
        used.add(id);
        const md = cardMarkdown({ front, back: isCloze ? '' : back }, id);
        (md.startsWith('---card---') ? blocks : lines).push(md);
    }

    // A block card's back runs to the next ---card--- marker, so block cards go last to keep other cards out of it.
    const all = [...lines, ...blocks];
    const markdown = `---\ntags: [${deckTag}]\n---\n\n${all.join('\n\n')}\n`;
    return { markdown, cards: all.length, skipped };
}
