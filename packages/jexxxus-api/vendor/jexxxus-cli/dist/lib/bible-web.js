const INDEX_TTL_MS = 60 * 60 * 1000;
const BOOK_TTL_MS = 60 * 60 * 1000;
const BOOK_ALIASES = {
    "song of solomon": "Song of Songs",
    "song of sol": "Song of Songs",
    canticles: "Song of Songs",
    enoch: "1 Enoch",
    "enoch (1 enoch)": "1 Enoch",
    "i enoch": "1 Enoch",
    "ii enoch": "2 Enoch",
    "iii enoch": "3 Enoch",
    psalm: "Psalms",
    ps: "Psalms",
    qoh: "Ecclesiastes",
    qoheleth: "Ecclesiastes",
    ecclesiasticus: "Sirach",
    wisdom: "Wisdom of Solomon",
    "prayer of manasseh": "Prayer of Manasses",
    manasseh: "Prayer of Manasses",
    manasses: "Prayer of Manasses",
    didascalica: "Didascalia",
    "gospel thomas": "Gospel of Thomas",
    "thomas the contender": "Book of Thomas the Contender",
    hermetica: "Corpus Hermeticum",
    "corpus hermeticum": "Corpus Hermeticum",
    pistis: "Pistis Sophia",
};
let indexCache = null;
const bookCache = new Map();
export function bibleSiteOrigin() {
    return (process.env.JEXXXUS_BIBLE_API_BASE_URL?.trim() ||
        process.env.BIBLE_JEXXXUS_API_BASE_URL?.trim() ||
        process.env.BIBLE_JEXXXUS_ORIGIN?.trim() ||
        "https://bible.jexxx.us").replace(/\/$/, "");
}
export function jexxxusApiBibleBase() {
    return (process.env.JEXXXUS_API_URL?.trim() ||
        process.env.JEXXXUS_API_BASE_URL?.trim() ||
        "https://api.jexxx.us").replace(/\/$/, "") + "/api/v1/bible";
}
function normalizeBookKey(name) {
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
function compactBookKey(name) {
    return normalizeBookKey(name).replace(/[\s-]+/g, "");
}
async function fetchText(url) {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(20_000),
            headers: {
                Accept: "application/json, text/plain, application/xml, */*",
                "User-Agent": "JEXXXUS-CLI-Bible/1.0",
            },
        });
        if (!response.ok)
            return null;
        return await response.text();
    }
    catch {
        return null;
    }
}
async function fetchJson(url) {
    const text = await fetchText(url);
    if (!text)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
export async function loadLiveBibleCatalog(force = false) {
    const now = Date.now();
    if (!force && indexCache && now - indexCache.at < INDEX_TTL_MS) {
        return indexCache.books;
    }
    const origin = bibleSiteOrigin();
    let raw = (await fetchJson(`${origin}/data/index.json`)) || null;
    // API catalog fallback if site index fails
    if (!raw?.length) {
        const api = await fetchJson(`${jexxxusApiBibleBase()}/books`);
        if (api?.data?.length) {
            raw = api.data.map((b) => ({
                name: b.name,
                canon: b.canon || "Unknown",
                file: b.file || `${b.name.replace(/\s+/g, "_")}.json`,
                chapterCount: b.chapters || 0,
            }));
        }
    }
    if (!raw?.length) {
        if (indexCache)
            return indexCache.books;
        throw new Error("Unable to load Bible catalog from bible.jexxx.us or API");
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
export async function resolveLiveBook(bookQuery) {
    const books = await loadLiveBibleCatalog();
    const qNorm = normalizeBookKey(bookQuery);
    const qCompact = compactBookKey(bookQuery);
    const alias = BOOK_ALIASES[qNorm] ?? BOOK_ALIASES[qCompact];
    if (alias) {
        const hit = books.find((b) => normalizeBookKey(b.name) === normalizeBookKey(alias));
        if (hit)
            return hit;
    }
    let hit = books.find((b) => normalizeBookKey(b.name) === qNorm) ||
        books.find((b) => compactBookKey(b.name) === qCompact);
    if (hit)
        return hit;
    const slugish = qNorm.replace(/-/g, " ");
    hit = books.find((b) => normalizeBookKey(b.name) === slugish);
    if (hit)
        return hit;
    const partial = books
        .filter((b) => {
        const n = normalizeBookKey(b.name);
        const c = compactBookKey(b.name);
        return n.includes(qNorm) || qNorm.includes(n) || c.includes(qCompact);
    })
        .sort((a, b) => a.name.length - b.name.length);
    if (partial.length === 1)
        return partial[0];
    return (books.find((b) => compactBookKey(b.file.replace(/\.json$/i, "")) === qCompact) ?? null);
}
async function loadLiveBookJson(meta) {
    const now = Date.now();
    const cached = bookCache.get(meta.file);
    if (cached && now - cached.at < BOOK_TTL_MS)
        return cached.raw;
    const origin = bibleSiteOrigin();
    const raw = await fetchJson(`${origin}/data/books/${encodeURIComponent(meta.file)}`);
    if (!raw?.chapters)
        return null;
    bookCache.set(meta.file, { at: now, raw });
    return raw;
}
function verseFromRows(rows, verse) {
    return rows.find((row) => row.verse === verse) ?? rows[verse - 1];
}
/** Fetch a single verse via live super-canon (preferred) + fallbacks. */
export async function fetchVerseFromWeb(bookName, chapter, verse, translation = "KJV") {
    // 1) Static corpus on bible.jexxx.us
    try {
        const meta = await resolveLiveBook(bookName);
        if (meta) {
            const book = await loadLiveBookJson(meta);
            const ch = book?.chapters?.find((c) => Number(c.chapter) === chapter) ||
                book?.chapters?.[chapter - 1];
            const rows = ch?.verses || [];
            const hit = verseFromRows(rows, verse);
            const text = hit?.text?.replace(/\s+/g, " ").trim();
            if (text) {
                return {
                    id: `${compactBookKey(meta.name)}-${chapter}-${verse}`,
                    book: meta.name,
                    chapter,
                    verse,
                    text,
                    canon: meta.canon,
                    sourceType: "bible.jexxx.us",
                };
            }
        }
    }
    catch {
        /* continue */
    }
    // 2) JEXXXUS | API (hardened corpus proxy)
    try {
        const apiBase = jexxxusApiBibleBase();
        const url = `${apiBase}/${encodeURIComponent(bookName)}/${chapter}/${verse}`;
        const data = await fetchJson(url);
        const text = data?.data?.text?.replace(/\s+/g, " ").trim();
        if (data?.success && text) {
            return {
                id: `${compactBookKey(bookName)}-${chapter}-${verse}`,
                book: data.data?.book || bookName,
                chapter,
                verse,
                text,
                canon: data.data?.canon,
                sourceType: "api.jexxx.us",
            };
        }
        // resolve endpoint
        const resolved = await fetchJson(`${apiBase}/resolve?ref=${encodeURIComponent(`${bookName} ${chapter}:${verse}`)}`);
        const rText = resolved?.data?.text?.replace(/\s+/g, " ").trim();
        if (resolved?.success && rText) {
            return {
                id: `${compactBookKey(bookName)}-${chapter}-${verse}`,
                book: resolved.data?.book || bookName,
                chapter,
                verse,
                text: rText,
                canon: resolved.data?.canon,
                sourceType: "api.jexxx.us",
            };
        }
    }
    catch {
        /* continue */
    }
    // 3) bible-api.com Protestant PD
    return fetchVerseFromBibleApiCom(bookName, chapter, verse, translation);
}
async function fetchVerseFromBibleApiCom(bookName, chapter, verse, translation) {
    const slug = bookName.toLowerCase().replace(/\s+/g, "-");
    let transParam = "web";
    if (translation.toUpperCase() === "KJV")
        transParam = "kjv";
    const url = `https://bible-api.com/${encodeURIComponent(slug)}+${chapter}?translation=${transParam}`;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok)
            return null;
        const data = (await response.json());
        const rows = data.verses ?? [];
        const hit = verseFromRows(rows, verse);
        const text = (hit?.text ?? (verse === 1 ? data.text : undefined))
            ?.replace(/\s+/g, " ")
            .trim();
        if (!text)
            return null;
        return {
            id: `${compactBookKey(bookName)}-${chapter}-${verse}`,
            book: bookName,
            chapter,
            verse,
            text,
            sourceType: "bible-api.com",
        };
    }
    catch {
        return null;
    }
}
export async function listLiveCanons() {
    const books = await loadLiveBibleCatalog();
    const map = new Map();
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
export async function listLiveChapters(bookName) {
    const meta = await resolveLiveBook(bookName);
    if (!meta)
        return [];
    const book = await loadLiveBookJson(meta);
    if (book?.chapters?.length) {
        return book.chapters
            .map((c) => Number(c.chapter))
            .filter((n) => Number.isFinite(n) && n > 0);
    }
    return Array.from({ length: meta.chapterCount }, (_, i) => i + 1);
}
export function aeoDiscoveryUrls(origin = bibleSiteOrigin()) {
    return {
        site: origin,
        llms: `${origin}/llms.txt`,
        llmsFull: `${origin}/llms-full.txt`,
        feed: `${origin}/feed.xml`,
        sitemap: `${origin}/sitemap.xml`,
        index: `${origin}/data/index.json`,
        apiBooks: `${jexxxusApiBibleBase()}/books`,
        apiManna: `${jexxxusApiBibleBase()}/manna`,
        apiAeo: `${jexxxusApiBibleBase()}/aeo`,
        apiResolve: `${jexxxusApiBibleBase()}/resolve?ref=`,
    };
}
export async function fetchBibleAeoBundle() {
    const urls = aeoDiscoveryUrls();
    const [llms, feed, apiAeo] = await Promise.all([
        fetchText(urls.llms),
        fetchText(urls.feed),
        fetchJson(urls.apiAeo),
    ]);
    const parts = [
        "# JEXXXUS | BIBLE — AEO / discovery",
        "",
        JSON.stringify(urls, null, 2),
        "",
        "## llms.txt (preview)",
        llms ? llms.slice(0, 3500) : "(unavailable — curl " + urls.llms + ")",
        "",
        "## feed.xml (preview)",
        feed ? feed.slice(0, 2000) : "(unavailable — curl " + urls.feed + ")",
    ];
    if (apiAeo) {
        parts.push("", "## api.jexxx.us /bible/aeo", JSON.stringify(apiAeo).slice(0, 2000));
    }
    return parts.join("\n");
}
export async function fetchDailyMannaText() {
    // Prefer API manna (parses feed)
    const api = await fetchJson(`${jexxxusApiBibleBase()}/manna`);
    if (api?.success && api.data) {
        return [
            "Daily Manna",
            api.data.title ? `Title: ${api.data.title}` : "",
            api.data.pubDate ? `Date: ${api.data.pubDate}` : "",
            api.data.link ? `Link: ${api.data.link}` : "",
            api.data.description ? `\n${api.data.description}` : "",
            api.source ? `\nSource: ${api.source}` : "",
        ]
            .filter(Boolean)
            .join("\n");
    }
    const feed = await fetchText(`${bibleSiteOrigin()}/feed.xml`);
    if (!feed) {
        return `Unable to load Daily Manna. Curl ${bibleSiteOrigin()}/feed.xml or ${jexxxusApiBibleBase()}/manna`;
    }
    const item = feed.match(/<item[\s\S]*?<\/item>/i)?.[0] || feed.slice(0, 1500);
    return `Daily Manna (raw feed item)\nSource: ${bibleSiteOrigin()}/feed.xml\n\n${item.slice(0, 2500)}`;
}
//# sourceMappingURL=bible-web.js.map