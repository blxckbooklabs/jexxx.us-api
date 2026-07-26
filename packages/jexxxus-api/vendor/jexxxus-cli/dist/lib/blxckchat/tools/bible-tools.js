import { getBibleSections, getBibleBooks, getBibleChapters, findBook, findVerseWithFallback, hasLocalBibleVault, looksLikeVerseReference, parseVerseReference, } from "../../bible.js";
import { aeoDiscoveryUrls, fetchBibleAeoBundle, fetchChapterFromWeb, fetchDailyMannaText, listLiveCanons, listLiveChapters, loadLiveBibleCatalog, resolveLiveBook, } from "../../bible-web.js";
import { formatBibleVerseForChat } from "../bible-format.js";
/** Book + chapter without verse, e.g. "Genesis 1" or "1 Enoch 7". */
function parseChapterReference(query) {
    const trimmed = query.trim();
    if (parseVerseReference(trimmed))
        return null;
    const m = trimmed.match(/^((?:\d+\s+)?[A-Za-z][A-Za-z0-9\s.'-]*?)\s+(\d+)\s*$/);
    if (!m?.[1] || !m[2])
        return null;
    return { bookName: m[1].trim(), chapter: parseInt(m[2], 10) };
}
function formatChapterForChat(payload, maxVerses = 40) {
    const head = `${payload.book} ${payload.chapter}${payload.canon ? ` · ${payload.canon}` : ""} · via ${payload.sourceType}`;
    const slice = payload.verses.slice(0, maxVerses);
    const body = slice.map((v) => `${v.verse}. ${v.text}`).join("\n");
    const more = payload.verses.length > maxVerses
        ? `\n… (${payload.verses.length - maxVerses} more verses — open ${payload.url})`
        : "";
    return `${head}\n${payload.url}\n\n${body}${more}`;
}
/**
 * Read-only scripture tool. Super-canon (131 books) via live bible.jexxx.us
 * corpus + api.jexxx.us fallbacks — no stale hardcoded Protestant list.
 */
export const bibleTool = {
    name: "bible_query",
    description: "Query the JEXXXUS super-canon Bible (131 books: Masoretic, Deuterocanon, Ethiopic-81, " +
        "Pseudepigrapha, Nag Hammadi, Hermetica). action='query' needs Book Chapter:Verse " +
        "(e.g. 'Genesis 1:1', 'Jn 3:16', '1 Enoch 1:1', 'Gospel of Thomas 1:5'). " +
        "action='chapter' with query 'Genesis 1' returns full chapter text. " +
        "action='catalog'|'canons'|'books' lists live catalog; action='chapters' needs book; " +
        "action='manna' Daily Manna; action='aeo' llms.txt/feed/sitemap discovery. " +
        "Do NOT use for TV titles — use tv_query. Not for VEIL articles — use veil_query.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: [
                    "query",
                    "chapter",
                    "catalog",
                    "canons",
                    "books",
                    "chapters",
                    "sections",
                    "manna",
                    "aeo",
                    "search",
                ],
                description: "Bible operation",
            },
            query: {
                type: "string",
                description: "Verse ref (Book Chapter:Verse), chapter ref (Book Chapter), or catalog filter",
            },
            section: {
                type: "string",
                description: "Local vault section (optional legacy) e.g. '01-Torah'",
            },
            book: {
                type: "string",
                description: "Book name for chapters/chapter (e.g. 'Gospel of Thomas')",
            },
            chapter: {
                type: "number",
                description: "Chapter number when action=chapter and book is set",
            },
            canon: {
                type: "string",
                description: "Filter books by canon (e.g. 'Nag Hammadi')",
            },
        },
        required: ["action"],
    },
    requiresConfirmation: false,
    async execute(args) {
        const rawAction = String(args.action ?? "").toLowerCase();
        const query = args.query;
        const section = args.section;
        const bookArg = args.book;
        const chapterArg = typeof args.chapter === "number"
            ? args.chapter
            : typeof args.chapter === "string"
                ? parseInt(args.chapter, 10)
                : undefined;
        const canon = args.canon;
        const wantsManna = rawAction.includes("manna") || rawAction === "daily";
        const wantsAeo = rawAction === "aeo" ||
            rawAction.includes("seo") ||
            rawAction.includes("llms") ||
            rawAction.includes("feed") ||
            rawAction.includes("rss");
        const wantsCatalog = rawAction === "catalog" || rawAction === "index" || rawAction === "list";
        const wantsCanons = rawAction.includes("canon") && !rawAction.includes("section");
        const wantsSections = rawAction === "sections" || rawAction === "section";
        const wantsBooks = rawAction === "books" ||
            (rawAction.includes("book") &&
                !bookArg &&
                !rawAction.includes("chapter") &&
                !wantsCatalog);
        const wantsChapterText = rawAction === "chapter" ||
            rawAction === "read" ||
            (Boolean(query && parseChapterReference(query)) &&
                !looksLikeVerseReference(query || ""));
        const wantsChaptersList = rawAction === "chapters" ||
            (rawAction.includes("chapter") &&
                !wantsChapterText &&
                Boolean(bookArg || query));
        const wantsSearch = rawAction === "search" || rawAction === "find";
        const wantsVerse = Boolean(query && looksLikeVerseReference(query)) ||
            rawAction === "query" ||
            rawAction.includes("verse");
        if (wantsManna) {
            return fetchDailyMannaText();
        }
        if (wantsAeo) {
            return fetchBibleAeoBundle();
        }
        if (wantsCanons) {
            try {
                const canons = await listLiveCanons();
                return (`Live canons from bible.jexxx.us (${canons.reduce((n, c) => n + c.bookCount, 0)} books):\n` +
                    canons
                        .map((c) => `- ${c.canon}: ${c.bookCount} books · ${c.chapterCount} chapters`)
                        .join("\n") +
                    `\n\nDiscovery: ${JSON.stringify(aeoDiscoveryUrls(), null, 2)}`);
            }
            catch (e) {
                return `Error loading canons: ${e?.message || e}`;
            }
        }
        if (wantsCatalog || (wantsBooks && !section)) {
            try {
                let books = await loadLiveBibleCatalog();
                if (canon) {
                    const needle = canon.toLowerCase();
                    books = books.filter((b) => b.canon.toLowerCase().includes(needle));
                }
                if (query &&
                    !looksLikeVerseReference(query) &&
                    !parseChapterReference(query)) {
                    const needle = query.toLowerCase();
                    books = books.filter((b) => b.name.toLowerCase().includes(needle) ||
                        b.canon.toLowerCase().includes(needle));
                }
                const lines = books.map((b) => `- ${b.name} (${b.chapterCount} ch) · ${b.canon} · https://bible.jexxx.us/${b.name.replace(/\s+/g, "-")}`);
                return (`Super-canon catalog (${books.length} books` +
                    (canon ? `, canon~${canon}` : "") +
                    `):\n${lines.join("\n")}\n\n` +
                    `For verse text use action=query with "Book Chapter:Verse". ` +
                    `For full chapter use action=chapter with "Book N". ` +
                    `AEO: ${aeoDiscoveryUrls().llms}`);
            }
            catch (e) {
                if (hasLocalBibleVault() && section) {
                    return JSON.stringify(getBibleBooks(section));
                }
                return `Error loading catalog: ${e?.message || e}`;
            }
        }
        if (wantsSections) {
            try {
                const canons = await listLiveCanons();
                const vaultHint = hasLocalBibleVault()
                    ? `\nLocal vault sections: ${getBibleSections().join(", ")}`
                    : "";
                return ("Live canons (super-canon):\n" +
                    canons.map((c) => `- ${c.canon} (${c.bookCount} books)`).join("\n") +
                    vaultHint +
                    "\nUse action=catalog or action=books for full titles.");
            }
            catch {
                return ("Use action=query with a verse reference " +
                    "(e.g. 'Genesis 1:1' or '1 Enoch 1:1') — web corpus is used automatically. " +
                    "Or action=catalog / action=canons / action=aeo.");
            }
        }
        if (wantsBooks && section) {
            try {
                const books = getBibleBooks(section);
                if (books.length)
                    return JSON.stringify(books);
            }
            catch {
                /* fall through to live */
            }
            try {
                let live = await loadLiveBibleCatalog();
                if (canon) {
                    live = live.filter((b) => b.canon.toLowerCase().includes(canon.toLowerCase()));
                }
                return live.map((b) => `${b.name} [${b.canon}]`).join("\n");
            }
            catch (e) {
                return `Error: ${e?.message || e}`;
            }
        }
        if (wantsChapterText) {
            let bookName = bookArg;
            let chapterNum = chapterArg;
            if (query) {
                const chRef = parseChapterReference(query);
                if (chRef) {
                    bookName = chRef.bookName;
                    chapterNum = chRef.chapter;
                }
            }
            if (!bookName || !chapterNum || !Number.isFinite(chapterNum)) {
                return "Error: chapter requires book+chapter (e.g. query='Genesis 1' or book='1 Enoch' chapter=1).";
            }
            const payload = await fetchChapterFromWeb(bookName, chapterNum);
            if (!payload) {
                return `No chapter found for "${bookName} ${chapterNum}". Try action=catalog.`;
            }
            return formatChapterForChat(payload);
        }
        if (wantsChaptersList) {
            const bookName = bookArg || query?.replace(/\s+\d+.*$/, "").trim();
            if (!bookName) {
                return "Error: chapters requires book (e.g. book='1 Enoch').";
            }
            try {
                const meta = await resolveLiveBook(bookName);
                const chapters = await listLiveChapters(bookName);
                if (meta && chapters.length) {
                    return (`${meta.name} · ${meta.canon} · ${chapters.length} chapters\n` +
                        `Chapters: ${chapters.join(", ")}\n` +
                        `URL: https://bible.jexxx.us/${meta.name.replace(/\s+/g, "-")}\n\n` +
                        `Fetch verse: action=query "${meta.name} 1:1". Full chapter: action=chapter "${meta.name} 1".`);
                }
            }
            catch {
                /* vault fallback */
            }
            if (hasLocalBibleVault() && section) {
                const bookInfo = findBook(bookName);
                const bookFolder = bookInfo?.book ?? bookName;
                const chapters = getBibleChapters(section, bookFolder);
                return (`Chapter list for ${bookName}:\n${chapters.join(", ")}\n\n` +
                    `Use action=query with "${bookName} 1:1".`);
            }
            return `No chapters found for "${bookName}". Try action=catalog.`;
        }
        if (wantsSearch &&
            query &&
            !looksLikeVerseReference(query) &&
            !parseChapterReference(query)) {
            try {
                const books = await loadLiveBibleCatalog();
                const needle = query.toLowerCase();
                const matches = books.filter((b) => b.name.toLowerCase().includes(needle) ||
                    b.canon.toLowerCase().includes(needle));
                if (!matches.length)
                    return `No catalog matches for "${query}".`;
                return matches
                    .map((b) => `${b.name} (${b.chapterCount} ch, ${b.canon}) — query e.g. "${b.name} 1:1"`)
                    .join("\n");
            }
            catch (e) {
                return `Search failed: ${e?.message || e}`;
            }
        }
        if (wantsVerse || wantsSearch) {
            if (!query)
                return "Error: 'query' is required, e.g. 'Genesis 1:1'.";
            if (!looksLikeVerseReference(query)) {
                const ch = parseChapterReference(query);
                if (ch) {
                    const payload = await fetchChapterFromWeb(ch.bookName, ch.chapter);
                    if (payload)
                        return formatChapterForChat(payload);
                }
                return (`This does not look like a scripture reference (expected Book Chapter:Verse, e.g. "1 John 1:9" or "Gospel of Thomas 1:5"). ` +
                    `For a full chapter use action=chapter with "Genesis 1". For catalog search use action=search. For TV titles use tv_query.`);
            }
            const verse = await findVerseWithFallback(query);
            if (!verse) {
                return (`No verse found matching "${query}". Check action=catalog for exact book titles ` +
                    `(e.g. "Song of Songs"; "Song of Solomon" is aliased). ` +
                    `Abbreviations like Jn, 1Cor, Gen work. If the user meant TV content, call tv_query instead.`);
            }
            return formatBibleVerseForChat(verse);
        }
        return (`Error: could not determine lookup from action="${rawAction}". ` +
            `Use action=query with "Book Chapter:Verse", action=chapter with "Book N", or catalog|canons|chapters|manna|aeo.`);
    },
};
//# sourceMappingURL=bible-tools.js.map