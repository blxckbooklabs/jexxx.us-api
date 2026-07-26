/**
 * Super-canon client for bible.jexxx.us public static corpus.
 * SoT: https://bible.jexxx.us/data/index.json + /data/books/*.json
 * Avoids circular dependency on /api/bible (which historically proxied a stale Railway API).
 */
export type CorpusBookMeta = {
    name: string;
    canon: string;
    file: string;
    chapterCount: number;
};
export type CorpusVerse = {
    verse: number;
    text: string;
    heading?: string;
};
export type CorpusChapter = {
    chapter: number;
    verses: CorpusVerse[];
};
export type CorpusBook = {
    name: string;
    canon?: string;
    abbreviation?: string;
    chapters: CorpusChapter[];
};
export declare function bibleSiteOrigin(): string;
export declare function normalizeBookKey(name: string): string;
export declare function compactBookKey(name: string): string;
export declare function loadCorpusIndex(force?: boolean): Promise<CorpusBookMeta[]>;
export declare function resolveBookMeta(bookQuery: string): Promise<CorpusBookMeta | null>;
export declare function loadCorpusBook(meta: CorpusBookMeta, force?: boolean): Promise<CorpusBook | null>;
export declare function getChapterFromCorpus(bookQuery: string, chapter: number): Promise<{
    meta: CorpusBookMeta;
    book: CorpusBook;
    chapter: CorpusChapter;
    source: string;
} | null>;
export declare function getVerseFromCorpus(bookQuery: string, chapter: number, verse: number): Promise<{
    meta: CorpusBookMeta;
    reference: string;
    text: string;
    heading?: string;
    source: string;
    canon?: string;
} | null>;
export declare function listCanons(): Promise<Array<{
    canon: string;
    bookCount: number;
    chapterCount: number;
}>>;
export declare function aeoDiscovery(origin?: string): {
    site: string;
    llms: string;
    llmsFull: string;
    feed: string;
    sitemap: string;
    robots: string;
    index: string;
    booksData: string;
    citation: {
        book: string;
        chapter: string;
        verseHash: string;
        verseQuery: string;
        note: string;
    };
};
export declare function fetchAeoSurfaces(): Promise<{
    discovery: ReturnType<typeof aeoDiscovery>;
    llmsPreview: string | null;
    feedPreview: string | null;
    indexBookCount: number;
}>;
/** Pull Daily Manna-ish first item from RSS if present. */
export declare function fetchDailyMannaFromFeed(): Promise<{
    title?: string;
    link?: string;
    description?: string;
    pubDate?: string;
    rawPreview: string;
} | null>;
export declare function publicBookUrl(meta: CorpusBookMeta, chapter?: number): string;
export declare function publicChapterUrl(bookName: string, chapter: number): string;
