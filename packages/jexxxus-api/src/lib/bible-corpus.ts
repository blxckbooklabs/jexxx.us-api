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

const DEFAULT_ORIGIN = "https://bible.jexxx.us";
const INDEX_TTL_MS = 60 * 60 * 1000;
const BOOK_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;

/** Display / citation aliases → canonical index name. */
const BOOK_ALIASES: Record<string, string> = {
  "song of solomon": "Song of Songs",
  "song of sol": "Song of Songs",
  canticles: "Song of Songs",
  "canticle of canticles": "Song of Songs",
  enoch: "1 Enoch",
  "enoch (1 enoch)": "1 Enoch",
  "i enoch": "1 Enoch",
  "ii enoch": "2 Enoch",
  "iii enoch": "3 Enoch",
  "psalm": "Psalms",
  "ps": "Psalms",
  "pss": "Psalms",
  qoh: "Ecclesiastes",
  qoheleth: "Ecclesiastes",
  "ecclesiasticus": "Sirach",
  "wisdom": "Wisdom of Solomon",
  "wisdom of sol": "Wisdom of Solomon",
  "letter of jeremy": "Letter of Jeremiah",
  "epistle of jeremy": "Letter of Jeremiah",
  "bel": "Bel and the Dragon",
  "sus": "Susanna",
  "prayer of manasseh": "Prayer of Manasses",
  manasseh: "Prayer of Manasses",
  "manasses": "Prayer of Manasses",
  "4 baruch": "4 Baruch",
  "paralipomena of jeremiah": "4 Baruch",
  "paraleipomena jeremiou": "4 Baruch",
  didascalica: "Didascalia",
  "apostolic constitutions": "Apostolic Constitutions",
  "gospel thomas": "Gospel of Thomas",
  "gos thom": "Gospel of Thomas",
  "gos phil": "Gospel of Philip",
  "gos truth": "Gospel of Truth",
  "gos mary": "Gospel of Mary",
  "gos judas": "Gospel of Judas",
  "thom contender": "Book of Thomas the Contender",
  "thomas the contender": "Book of Thomas the Contender",
  "corpus hermeticum": "Corpus Hermeticum",
  hermetica: "Corpus Hermeticum",
  "pistis": "Pistis Sophia",
};

let indexCache: { at: number; books: CorpusBookMeta[] } | null = null;
const bookCache = new Map<string, { at: number; book: CorpusBook }>();

export function bibleSiteOrigin(): string {
  return (
    process.env.BIBLE_JEXXXUS_ORIGIN?.trim() ||
    process.env.JEXXXUS_BIBLE_SITE_URL?.trim() ||
    DEFAULT_ORIGIN
  ).replace(/\/$/, "");
}

export function normalizeBookKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^the\s+/, "")
    .replace(/['’.]/g, "")
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactBookKey(name: string): string {
  return normalizeBookKey(name).replace(/[\s-]+/g, "");
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "application/json, text/plain, application/xml, */*",
        "User-Agent": "JEXXXUS-API-BibleCorpus/1.0",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const text = await fetchText(url);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function loadCorpusIndex(
  force = false,
): Promise<CorpusBookMeta[]> {
  const now = Date.now();
  if (!force && indexCache && now - indexCache.at < INDEX_TTL_MS) {
    return indexCache.books;
  }

  const origin = bibleSiteOrigin();
  const raw = await fetchJson<CorpusBookMeta[]>(`${origin}/data/index.json`);
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    if (indexCache) return indexCache.books;
    throw new Error(`Failed to load Bible corpus index from ${origin}`);
  }

  const books = raw.map((b) => ({
    name: String(b.name),
    canon: String(b.canon ?? "Unknown"),
    file: String(b.file),
    chapterCount: Number(b.chapterCount) || 0,
  }));

  indexCache = { at: now, books };
  return books;
}

export async function resolveBookMeta(
  bookQuery: string,
): Promise<CorpusBookMeta | null> {
  const books = await loadCorpusIndex();
  const qNorm = normalizeBookKey(bookQuery);
  const qCompact = compactBookKey(bookQuery);
  const aliasTarget = BOOK_ALIASES[qNorm] ?? BOOK_ALIASES[qCompact];

  if (aliasTarget) {
    const hit = books.find(
      (b) => normalizeBookKey(b.name) === normalizeBookKey(aliasTarget),
    );
    if (hit) return hit;
  }

  // Exact normalized
  let hit =
    books.find((b) => normalizeBookKey(b.name) === qNorm) ||
    books.find((b) => compactBookKey(b.name) === qCompact);
  if (hit) return hit;

  // Hyphen/underscore slug form (1-enoch, gospel-of-thomas)
  const slugish = qNorm.replace(/-/g, " ");
  hit = books.find((b) => normalizeBookKey(b.name) === slugish);
  if (hit) return hit;

  // Unique substring (prefer longer names)
  const partial = books
    .filter((b) => {
      const n = normalizeBookKey(b.name);
      const c = compactBookKey(b.name);
      return n.includes(qNorm) || qNorm.includes(n) || c.includes(qCompact);
    })
    .sort((a, b) => a.name.length - b.name.length);
  if (partial.length === 1) return partial[0]!;
  // Prefer exact file stem match
  const fileHit = books.find(
    (b) =>
      compactBookKey(b.file.replace(/\.json$/i, "")) === qCompact ||
      normalizeBookKey(b.file.replace(/\.json$/i, "").replace(/_/g, " ")) ===
        qNorm,
  );
  return fileHit ?? null;
}

export async function loadCorpusBook(
  meta: CorpusBookMeta,
  force = false,
): Promise<CorpusBook | null> {
  const now = Date.now();
  const cached = bookCache.get(meta.file);
  if (!force && cached && now - cached.at < BOOK_TTL_MS) {
    return cached.book;
  }

  const origin = bibleSiteOrigin();
  const raw = await fetchJson<CorpusBook>(
    `${origin}/data/books/${encodeURIComponent(meta.file)}`,
  );
  if (!raw || !Array.isArray(raw.chapters)) return null;

  const book: CorpusBook = {
    name: raw.name || meta.name,
    canon: raw.canon || meta.canon,
    abbreviation: raw.abbreviation,
    chapters: raw.chapters.map((ch) => ({
      chapter: Number(ch.chapter) || 0,
      verses: (ch.verses || []).map((v) => ({
        verse: Number(v.verse) || 0,
        text: String(v.text || "").replace(/\s+/g, " ").trim(),
        ...(v.heading ? { heading: String(v.heading) } : {}),
      })),
    })),
  };

  bookCache.set(meta.file, { at: now, book });
  return book;
}

export async function getChapterFromCorpus(
  bookQuery: string,
  chapter: number,
): Promise<{
  meta: CorpusBookMeta;
  book: CorpusBook;
  chapter: CorpusChapter;
  source: string;
} | null> {
  const meta = await resolveBookMeta(bookQuery);
  if (!meta) return null;
  const book = await loadCorpusBook(meta);
  if (!book) return null;
  const ch =
    book.chapters.find((c) => c.chapter === chapter) ||
    book.chapters[chapter - 1];
  if (!ch) return null;
  return {
    meta,
    book,
    chapter: ch,
    source: `${bibleSiteOrigin()}/data/books/${meta.file}`,
  };
}

export async function getVerseFromCorpus(
  bookQuery: string,
  chapter: number,
  verse: number,
): Promise<{
  meta: CorpusBookMeta;
  reference: string;
  text: string;
  heading?: string;
  source: string;
  canon?: string;
} | null> {
  const hit = await getChapterFromCorpus(bookQuery, chapter);
  if (!hit) return null;
  const v =
    hit.chapter.verses.find((row) => row.verse === verse) ||
    hit.chapter.verses[verse - 1];
  if (!v?.text) return null;
  return {
    meta: hit.meta,
    reference: `${hit.meta.name} ${chapter}:${verse}`,
    text: v.text,
    ...(v.heading ? { heading: v.heading } : {}),
    source: hit.source,
    canon: hit.meta.canon,
  };
}

export async function listCanons(): Promise<
  Array<{ canon: string; bookCount: number; chapterCount: number }>
> {
  const books = await loadCorpusIndex();
  const map = new Map<string, { bookCount: number; chapterCount: number }>();
  for (const b of books) {
    const cur = map.get(b.canon) || { bookCount: 0, chapterCount: 0 };
    cur.bookCount += 1;
    cur.chapterCount += b.chapterCount;
    map.set(b.canon, cur);
  }
  return [...map.entries()]
    .map(([canon, stats]) => ({ canon, ...stats }))
    .sort((a, b) => a.canon.localeCompare(b.canon));
}

export function aeoDiscovery(origin = bibleSiteOrigin()) {
  return {
    site: origin,
    llms: `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
    feed: `${origin}/feed.xml`,
    sitemap: `${origin}/sitemap.xml`,
    robots: `${origin}/robots.txt`,
    index: `${origin}/data/index.json`,
    booksData: `${origin}/data/books/`,
    citation: {
      book: `${origin}/{Book}`,
      chapter: `${origin}/{Book}/{n}`,
      verseHash: `${origin}/{Book}/{n}#v{N}`,
      verseQuery: `${origin}/{Book}/{n}?v={N}`,
      note: "Canonical slugs are Title-Case with hyphens (e.g. /Song-of-Songs/1#v1). Case/underscore variants 308 to canonical.",
    },
  };
}

export async function fetchAeoSurfaces(): Promise<{
  discovery: ReturnType<typeof aeoDiscovery>;
  llmsPreview: string | null;
  feedPreview: string | null;
  indexBookCount: number;
}> {
  const origin = bibleSiteOrigin();
  const discovery = aeoDiscovery(origin);
  const [llms, feed, books] = await Promise.all([
    fetchText(discovery.llms),
    fetchText(discovery.feed),
    loadCorpusIndex().catch(() => [] as CorpusBookMeta[]),
  ]);

  return {
    discovery,
    llmsPreview: llms ? llms.slice(0, 4000) : null,
    feedPreview: feed ? feed.slice(0, 4000) : null,
    indexBookCount: books.length,
  };
}

/** Pull Daily Manna-ish first item from RSS if present. */
export async function fetchDailyMannaFromFeed(): Promise<{
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  rawPreview: string;
} | null> {
  const origin = bibleSiteOrigin();
  const xml = await fetchText(`${origin}/feed.xml`);
  if (!xml) return null;

  const itemMatch = xml.match(/<item[\s\S]*?<\/item>/i);
  if (!itemMatch) {
    return { rawPreview: xml.slice(0, 1500) };
  }
  const item = itemMatch[0];
  const pick = (tag: string) => {
    const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim();
  };
  return {
    title: pick("title"),
    link: pick("link"),
    description: pick("description"),
    pubDate: pick("pubDate"),
    rawPreview: item.slice(0, 2000),
  };
}

export function publicBookUrl(meta: CorpusBookMeta, chapter?: number): string {
  const origin = bibleSiteOrigin();
  const slug = meta.name.replace(/\s+/g, "-");
  if (chapter != null) return `${origin}/${encodeURIComponent(slug).replace(/%2F/g, "/")}/${chapter}`.replace(/%20/g, "-");
  // Prefer readable Title-Case hyphens without over-encoding
  return `${origin}/${meta.name.replace(/\s+/g, "-")}`;
}

export function publicChapterUrl(bookName: string, chapter: number): string {
  return `${bibleSiteOrigin()}/${bookName.replace(/\s+/g, "-")}/${chapter}`;
}
