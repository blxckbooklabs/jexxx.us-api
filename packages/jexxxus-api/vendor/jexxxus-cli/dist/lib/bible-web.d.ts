/**
 * Web/corpus Bible lookups for agents without a local vault.
 * SoT: bible.jexxx.us static JSON (/data/index.json + /data/books/*).
 * Fallbacks: JEXXXUS | API /api/v1/bible, then bible-api.com (Protestant PD).
 */
import type { BibleVerse } from "./bible.js";
export type CorpusBookMeta = {
    name: string;
    canon: string;
    file: string;
    chapterCount: number;
};
export declare function bibleSiteOrigin(): string;
export declare function jexxxusApiBibleBase(): string;
export declare function loadLiveBibleCatalog(force?: boolean): Promise<CorpusBookMeta[]>;
export declare function resolveLiveBook(bookQuery: string): Promise<CorpusBookMeta | null>;
/** Fetch a single verse via live super-canon (preferred) + fallbacks. */
export declare function fetchVerseFromWeb(bookName: string, chapter: number, verse: number, translation?: string): Promise<BibleVerse | null>;
export declare function listLiveCanons(): Promise<Array<{
    canon: string;
    bookCount: number;
    chapterCount: number;
}>>;
export declare function listLiveChapters(bookName: string): Promise<number[]>;
export declare function aeoDiscoveryUrls(origin?: string): {
    site: string;
    llms: string;
    llmsFull: string;
    feed: string;
    sitemap: string;
    index: string;
    apiBooks: string;
    apiManna: string;
    apiAeo: string;
    apiResolve: string;
};
export declare function fetchBibleAeoBundle(): Promise<string>;
export declare function fetchDailyMannaText(): Promise<string>;
//# sourceMappingURL=bible-web.d.ts.map