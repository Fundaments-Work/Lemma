import { describe, expect, it } from 'vitest';
import { sanitizeUrlForDisplay, usesInsecureHttp } from '../src/data/constants';

describe('sanitizeUrlForDisplay', () => {
    it('strips username and password', () => {
        const sanitized = sanitizeUrlForDisplay('https://alice:s3cret@example.com:5984/lemma');
        expect(sanitized).not.toContain('alice');
        expect(sanitized).not.toContain('s3cret');
        expect(sanitized).toContain('example.com:5984/lemma');
    });

    it('strips a username without a password', () => {
        const sanitized = sanitizeUrlForDisplay('https://alice@example.com/lemma');
        expect(sanitized).toBe('https://example.com/lemma');
    });

    it('leaves unparseable input untouched', () => {
        expect(sanitizeUrlForDisplay('not a url')).toBe('not a url');
    });

    it('strips credentials from unparseable input', () => {
        expect(sanitizeUrlForDisplay('https://alice:s3cret@[bad')).toBe('https://[bad');
    });
});

describe('usesInsecureHttp', () => {
    it('flags plain http on a remote host', () => {
        expect(usesInsecureHttp('http://example.com:5984/lemma')).toBe(true);
    });

    it('allows plain http on loopback hosts', () => {
        expect(usesInsecureHttp('http://localhost:5984/lemma')).toBe(false);
        expect(usesInsecureHttp('http://127.0.0.1:5984/lemma')).toBe(false);
        expect(usesInsecureHttp('http://[::1]:5984/lemma')).toBe(false);
    });

    it('does not flag https or invalid input', () => {
        expect(usesInsecureHttp('https://example.com:5984/lemma')).toBe(false);
        expect(usesInsecureHttp('not a url')).toBe(false);
    });
});
