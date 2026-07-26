/**
 * JEXXXUS | API Bible routes — super-canon (131 books) via bible.jexxx.us static corpus.
 *
 * Priority for chapter/verse:
 *   1. Local sovereign vault (optional, BIBLE_VAULT_PATH)
 *   2. bible.jexxx.us /data/index.json + /data/books/*.json  (SoT for full canon)
 *   3. bible-api.com (Protestant PD translations only)
 *
 * AEO/RSS discovery always curls bible.jexxx.us (llms.txt, feed.xml, sitemap).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  aeoDiscovery,
  bibleSiteOrigin,
  fetchAeoSurfaces,
  fetchDailyMannaFromFeed,
  getChapterFromCorpus,
  getVerseFromCorpus,
  listCanons,
  loadCorpusIndex,
  publicChapterUrl,
} from "../../lib/bible-corpus.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type FastifyInstance = any;

const BIBLE_API_BASE = "https://bible-api.com";
const SOVEREIGN_VAULT_PATH =
  process.env.BIBLE_VAULT_PATH ||
  path.join(__dirname, "../../../data/bible-obsidian");

const availableTranslations = [
  {
    id: "SOVEREIGN",
    name: "JEXXXUS | BIBLE super-canon (bible.jexxx.us)",
    lang: "English",
    publicDomain: true,
  },
  { id: "KJV", name: "King James Version", lang: "English", publicDomain: true },
  { id: "WEB", name: "World English Bible", lang: "English", publicDomain: true },
  {
    id: "ASV",
    name: "American Standard Version",
    lang: "English",
    publicDomain: true,
  },
  {
    id: "BBE",
    name: "Basic English Bible",
    lang: "English",
    publicDomain: true,
  },
];

const findSovereignFiles = (
  bookSlug: string,
  chapter: number,
): string[] | null => {
  const specialMappings: Record<string, { dir: string; pattern: string }> = {
    "gospel-of-thomas": {
      dir: "08-NagHammadi/GospelOfThomas",
      pattern: `Saying-${chapter}.md`,
    },
    "gospel-of-truth": {
      dir: "08-NagHammadi/GospelOfTruth",
      pattern: `Section-${chapter}.md`,
    },
    "gospel-of-philip": {
      dir: "08-NagHammadi/GospelOfPhilip",
      pattern: `Section-${chapter}.md`,
    },
    didascalia: {
      dir: "07-EthiopicApocrypha/73-Didascalia",
      pattern: `Didascalia-CH-${chapter}.md`,
    },
    "apostolic-constitutions": {
      dir: "07-EthiopicApocrypha/72-ApostolicConstitutions/HornerStatutes",
      pattern: `HORNER-${chapter}-*.md`,
    },
  };

  const slug = bookSlug.toLowerCase().replace(/\s+/g, "-");
  if (specialMappings[slug]) {
    const mapping = specialMappings[slug]!;
    const fullDir = path.join(SOVEREIGN_VAULT_PATH, mapping.dir);
    if (!fs.existsSync(fullDir)) return null;

    if (mapping.pattern.includes("*")) {
      const [prefix = "", suffix = ""] = mapping.pattern.split("*");
      return fs
        .readdirSync(fullDir)
        .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
        .sort()
        .map((f) => path.join(fullDir, f));
    }

    const fullPath = path.join(fullDir, mapping.pattern);
    return fs.existsSync(fullPath) ? [fullPath] : null;
  }

  const vaultDirs = [
    "01-Torah",
    "02-Historical",
    "03-Poetic",
    "04-Prophets",
    "05-Deuterocanonical",
    "06-NewTestament",
    "07-EthiopicApocrypha",
    "08-NagHammadi",
  ];

  const needle = slug.replace(/-/g, "");
  for (const vDir of vaultDirs) {
    const categoryPath = path.join(SOVEREIGN_VAULT_PATH, vDir);
    if (!fs.existsSync(categoryPath)) continue;

    const books = fs.readdirSync(categoryPath);
    const bookDir = books.find((b) =>
      b.toLowerCase().replace(/[^a-z0-9]/g, "").includes(needle),
    );
    if (!bookDir) continue;

    const chapterPath = path.join(categoryPath, bookDir, `Chapter ${chapter}`);
    if (!fs.existsSync(chapterPath)) continue;

    return fs
      .readdirSync(chapterPath)
      .filter((f) => f.endsWith(".md"))
      .sort((a, b) => {
        const aVerse = parseInt(a.split("-").pop() || "0", 10);
        const bVerse = parseInt(b.split("-").pop() || "0", 10);
        return aVerse - bVerse;
      })
      .map((f) => path.join(chapterPath, f));
  }

  return null;
};

const parseVerseFromMarkdown = (filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const body = content.split("---").pop()?.trim() || "";
    const verseMatch = content.match(/verse:\s*(\d+)/);
    const verseNum = verseMatch ? parseInt(verseMatch[1]!, 10) : 1;
    return {
      verse: verseNum,
      text: body.replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
    };
  } catch {
    return null;
  }
};

async function chapterFromVault(book: string, chapterNum: number) {
  const sovereignFiles = findSovereignFiles(book, chapterNum);
  if (!sovereignFiles?.length) return null;
  const verses = sovereignFiles
    .map((f) => parseVerseFromMarkdown(f))
    .filter((v): v is { verse: number; text: string } => v !== null);
  if (!verses.length) return null;
  return {
    reference: `${book} ${chapterNum}`,
    translation: "Sovereign Vault",
    chapter: chapterNum,
    verses,
    source: "local-vault",
  };
}

async function chapterFromBibleApi(
  book: string,
  chapterNum: number,
  translation: string,
) {
  const response = await fetch(
    `${BIBLE_API_BASE}/${encodeURIComponent(book)}+${chapterNum}?translation=${encodeURIComponent(translation)}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as any;
  return {
    reference: data.reference as string,
    translation: data.translation_name as string,
    chapter: chapterNum,
    verses: (data.verses || []).map((v: any) => ({
      verse: v.verse,
      text: String(v.text || "")
        .replace(/\n/g, " ")
        .trim(),
    })),
    source: "bible-api.com",
  };
}

export const bibleRoutes = async (server: FastifyInstance) => {
  /**
   * GET /api/v1/bible/health
   */
  server.get("/health", async () => {
    try {
      const books = await loadCorpusIndex();
      return {
        success: true,
        ok: true,
        site: bibleSiteOrigin(),
        bookCount: books.length,
        canons: await listCanons(),
      };
    } catch (e: any) {
      return {
        success: false,
        ok: false,
        site: bibleSiteOrigin(),
        error: e?.message || "corpus unavailable",
      };
    }
  });

  /**
   * GET /api/v1/bible/translations
   */
  server.get("/translations", async () => ({
    success: true,
    data: availableTranslations,
  }));

  /**
   * GET /api/v1/bible/books
   * Full super-canon catalog from bible.jexxx.us index (live, cached).
   * Query: ?canon=Nag+Hammadi
   */
  server.get("/books", async (request: any) => {
    const books = await loadCorpusIndex();
    const canonFilter = String(request.query?.canon || "").trim();
    const data = (canonFilter
      ? books.filter(
          (b) => b.canon.toLowerCase() === canonFilter.toLowerCase(),
        )
      : books
    ).map((b) => ({
      name: b.name,
      chapters: b.chapterCount,
      canon: b.canon,
      file: b.file,
      url: publicChapterUrl(b.name, 1).replace(/\/1$/, ""),
    }));
    return {
      success: true,
      count: data.length,
      source: `${bibleSiteOrigin()}/data/index.json`,
      data,
    };
  });

  /**
   * GET /api/v1/bible/canons
   */
  server.get("/canons", async () => {
    const canons = await listCanons();
    return {
      success: true,
      count: canons.length,
      source: `${bibleSiteOrigin()}/data/index.json`,
      data: canons,
    };
  });

  /**
   * GET /api/v1/bible/catalog — alias with summary stats
   */
  server.get("/catalog", async () => {
    const books = await loadCorpusIndex();
    const canons = await listCanons();
    return {
      success: true,
      source: `${bibleSiteOrigin()}/data/index.json`,
      stats: {
        books: books.length,
        chapters: books.reduce((n, b) => n + b.chapterCount, 0),
        canons: canons.length,
      },
      canons,
      books: books.map((b) => ({
        name: b.name,
        chapters: b.chapterCount,
        canon: b.canon,
      })),
    };
  });

  /**
   * GET /api/v1/bible/aeo — llms / feed / sitemap discovery (+ previews)
   */
  server.get("/aeo", async () => {
    const surfaces = await fetchAeoSurfaces();
    return { success: true, ...surfaces };
  });

  /**
   * GET /api/v1/bible/manna — Daily Manna from feed.xml
   */
  server.get("/manna", async (_req: any, reply: any) => {
    const manna = await fetchDailyMannaFromFeed();
    if (!manna) {
      return reply.status(502).send({
        success: false,
        error: "Unable to fetch feed.xml from bible.jexxx.us",
        feed: `${bibleSiteOrigin()}/feed.xml`,
      });
    }
    return {
      success: true,
      source: `${bibleSiteOrigin()}/feed.xml`,
      data: manna,
      discovery: aeoDiscovery(),
    };
  });

  /**
   * GET /api/v1/bible/feed — raw RSS passthrough (agents/curl)
   */
  server.get("/feed", async (_req: any, reply: any) => {
    try {
      const res = await fetch(`${bibleSiteOrigin()}/feed.xml`, {
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });
      if (!res.ok) {
        return reply.status(502).send({
          success: false,
          error: `Upstream feed ${res.status}`,
        });
      }
      const body = await res.text();
      return reply
        .type(res.headers.get("content-type") || "application/rss+xml")
        .header("Cache-Control", "public, max-age=300")
        .send(body);
    } catch (e: any) {
      return reply.status(502).send({
        success: false,
        error: e?.message || "feed fetch failed",
      });
    }
  });

  /**
   * GET /api/v1/bible/resolve?ref=Genesis+1:1
   */
  server.get("/resolve", async (request: any, reply: any) => {
    const ref = String(request.query?.ref || request.query?.q || "").trim();
    if (!ref) {
      return reply.status(400).send({
        success: false,
        error: "Missing ref (e.g. ref=Genesis+1:1 or 1+Enoch+1:1)",
      });
    }
    const m = ref.match(
      /^((?:\d+\s+)?[A-Za-z][A-Za-z0-9\s.'-]*?)\s+(\d+)\s*[: ]\s*(\d+)\s*$/,
    );
    if (!m?.[1] || !m[2] || !m[3]) {
      return reply.status(400).send({
        success: false,
        error: 'Expected "Book Chapter:Verse" (e.g. "Gospel of Thomas 1:5")',
      });
    }
    const book = m[1].trim();
    const chapter = parseInt(m[2], 10);
    const verse = parseInt(m[3], 10);
    const hit = await getVerseFromCorpus(book, chapter, verse);
    if (!hit) {
      return reply.status(404).send({
        success: false,
        error: `Verse not found: ${ref}`,
        hint: "List books via GET /api/v1/bible/books",
      });
    }
    return {
      success: true,
      data: {
        reference: hit.reference,
        book: hit.meta.name,
        chapter,
        verse,
        text: hit.text,
        heading: hit.heading,
        canon: hit.canon,
        translation: "JEXXXUS | BIBLE",
        source: hit.source,
        url: `${publicChapterUrl(hit.meta.name, chapter)}#v${verse}`,
      },
    };
  });

  /**
   * GET /api/v1/bible/search?q=
   * - If q looks like a ref → resolve verse
   * - Else filter catalog by name/canon
   */
  server.get("/search", async (request: any, reply: any) => {
    const q = String(request.query?.q || request.query?.query || "").trim();
    if (q.length < 2) {
      return reply.status(400).send({
        success: false,
        error: "q required (min 2 chars)",
      });
    }

    const ref = q.match(
      /^((?:\d+\s+)?[A-Za-z][A-Za-z0-9\s.'-]*?)\s+(\d+)\s*[: ]\s*(\d+)\s*$/,
    );
    if (ref?.[1] && ref[2] && ref[3]) {
      const hit = await getVerseFromCorpus(
        ref[1].trim(),
        parseInt(ref[2], 10),
        parseInt(ref[3], 10),
      );
      if (!hit) {
        return reply.status(404).send({ success: false, error: "not found" });
      }
      return {
        success: true,
        type: "verse",
        data: hit,
        url: `${publicChapterUrl(hit.meta.name, parseInt(ref[2], 10))}#v${ref[3]}`,
      };
    }

    const books = await loadCorpusIndex();
    const needle = q.toLowerCase();
    const matches = books.filter(
      (b) =>
        b.name.toLowerCase().includes(needle) ||
        b.canon.toLowerCase().includes(needle) ||
        b.file.toLowerCase().includes(needle.replace(/\s+/g, "_")),
    );
    return {
      success: true,
      type: "catalog",
      count: matches.length,
      data: matches,
      aeo: aeoDiscovery(),
    };
  });

  /**
   * GET /api/v1/bible/:book/:chapter
   */
  server.get("/:book/:chapter", async (request: any, reply: any) => {
    const book = decodeURIComponent(String(request.params.book || ""));
    const chapterNum = parseInt(String(request.params.chapter), 10);
    const translation = String(request.query?.translation || "KJV");

    if (!book || !Number.isFinite(chapterNum) || chapterNum < 1) {
      return reply.status(400).send({
        success: false,
        error: "Invalid book or chapter",
      });
    }

    // 1) Local vault
    const vault = await chapterFromVault(book, chapterNum);
    if (vault) {
      return { success: true, data: vault };
    }

    // 2) Super-canon static corpus
    try {
      const corpus = await getChapterFromCorpus(book, chapterNum);
      if (corpus) {
        return {
          success: true,
          data: {
            reference: `${corpus.meta.name} ${chapterNum}`,
            book: corpus.meta.name,
            canon: corpus.meta.canon,
            translation: "JEXXXUS | BIBLE",
            chapter: chapterNum,
            chapters: corpus.meta.chapterCount,
            verses: corpus.chapter.verses,
            source: corpus.source,
            url: publicChapterUrl(corpus.meta.name, chapterNum),
          },
        };
      }
    } catch {
      /* fall through */
    }

    // 3) Public PD API (Protestant)
    try {
      const remote = await chapterFromBibleApi(book, chapterNum, translation);
      if (remote) return { success: true, data: remote };
    } catch {
      /* fall through */
    }

    return reply.status(404).send({
      success: false,
      error: "Chapter not found",
      book,
      chapter: chapterNum,
      hint: "See GET /api/v1/bible/books for the live 131-book catalog",
      aeo: aeoDiscovery(),
    });
  });

  /**
   * GET /api/v1/bible/:book/:chapter/:verse
   */
  server.get(
    "/:book/:chapter/:verse",
    async (request: any, reply: any) => {
      const book = decodeURIComponent(String(request.params.book || ""));
      const chapterNum = parseInt(String(request.params.chapter), 10);
      const verseNum = parseInt(String(request.params.verse), 10);
      const translation = String(request.query?.translation || "KJV");

      if (
        !book ||
        !Number.isFinite(chapterNum) ||
        !Number.isFinite(verseNum) ||
        chapterNum < 1 ||
        verseNum < 1
      ) {
        return reply.status(400).send({
          success: false,
          error: "Invalid book, chapter, or verse",
        });
      }

      // Vault
      const sovereignFiles = findSovereignFiles(book, chapterNum);
      if (sovereignFiles) {
        const targetFile = sovereignFiles.find((f) =>
          f.includes(`-${verseNum}.md`),
        );
        if (targetFile) {
          const parsed = parseVerseFromMarkdown(targetFile);
          if (parsed) {
            return {
              success: true,
              data: {
                reference: `${book} ${chapterNum}:${verseNum}`,
                translation: "Sovereign Vault",
                book,
                chapter: chapterNum,
                verse: verseNum,
                text: parsed.text,
                source: "local-vault",
              },
            };
          }
        }
      }

      // Super-canon
      try {
        const hit = await getVerseFromCorpus(book, chapterNum, verseNum);
        if (hit) {
          return {
            success: true,
            data: {
              reference: hit.reference,
              translation: "JEXXXUS | BIBLE",
              book: hit.meta.name,
              chapter: chapterNum,
              verse: verseNum,
              text: hit.text,
              heading: hit.heading,
              canon: hit.canon,
              source: hit.source,
              url: `${publicChapterUrl(hit.meta.name, chapterNum)}#v${verseNum}`,
            },
          };
        }
      } catch {
        /* fall through */
      }

      // bible-api.com
      try {
        const response = await fetch(
          `${BIBLE_API_BASE}/${encodeURIComponent(book)}+${chapterNum}:${verseNum}?translation=${encodeURIComponent(translation)}`,
          { signal: AbortSignal.timeout(15_000) },
        );
        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            success: true,
            data: {
              reference: data.reference,
              translation: data.translation_name,
              book: data.book_name || book,
              chapter: chapterNum,
              verse: verseNum,
              text: String(data.text || "")
                .replace(/\n/g, " ")
                .trim(),
              source: "bible-api.com",
            },
          };
        }
      } catch {
        /* fall through */
      }

      return reply.status(404).send({
        success: false,
        error: "Verse not found",
        book,
        chapter: chapterNum,
        verse: verseNum,
        aeo: aeoDiscovery(),
      });
    },
  );
};
