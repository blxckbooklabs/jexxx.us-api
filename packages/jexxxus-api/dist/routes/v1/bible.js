// Use any for request/response types to bypass TypeScript issues
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Bible API integration
const BIBLE_API_BASE = 'https://bible-api.com';
// Sovereign Vault Path (pointing to the synced obsidian vault)
const SOVEREIGN_VAULT_PATH = process.env.BIBLE_VAULT_PATH || path.join(__dirname, '../../../data/bible-obsidian');
// Request validation
const bibleChapterSchema = z.object({
    book: z.string(),
    chapter: z.number().min(1),
    translation: z.string().default('KJV')
});
const bibleSearchSchema = z.object({
    query: z.string().min(3),
    translation: z.string().default('KJV')
});
// Available translations
const availableTranslations = [
    { id: 'KJV', name: 'King James Version', lang: 'English', publicDomain: true },
    { id: 'WEB', name: 'World English Bible', lang: 'English', publicDomain: true },
    { id: 'ASV', name: 'American Standard Version', lang: 'English', publicDomain: true },
    { id: 'AKJV', name: 'American King James Version', lang: 'English', publicDomain: true },
    { id: 'BBE', name: 'Basic English Bible', lang: 'English', publicDomain: true },
    { id: 'CJB', name: 'Concise Literal Version', lang: 'English', publicDomain: true },
    { id: 'DARBY', name: 'Darby Translation', lang: 'English', publicDomain: true },
    { id: 'ESV', name: 'English Standard Version', lang: 'English', publicDomain: false },
    { id: 'NASB', name: 'New American Standard Bible', lang: 'English', publicDomain: false },
    { id: 'NIV', name: 'New International Version', lang: 'English', publicDomain: false },
    { id: 'NKJV', name: 'New King James Version', lang: 'English', publicDomain: true },
    { id: 'NLT', name: 'New Living Translation', lang: 'English', publicDomain: false },
];
// Books of the Bible
const booksOfTheBible = [
    { name: 'Genesis', chapters: 50 },
    { name: 'Exodus', chapters: 40 },
    { name: 'Leviticus', chapters: 27 },
    { name: 'Numbers', chapters: 36 },
    { name: 'Deuteronomy', chapters: 34 },
    { name: 'Joshua', chapters: 24 },
    { name: 'Judges', chapters: 21 },
    { name: 'Ruth', chapters: 4 },
    { name: '1 Samuel', chapters: 31 },
    { name: '2 Samuel', chapters: 24 },
    { name: '1 Kings', chapters: 22 },
    { name: '2 Kings', chapters: 25 },
    { name: '1 Chronicles', chapters: 29 },
    { name: '2 Chronicles', chapters: 36 },
    { name: 'Ezra', chapters: 10 },
    { name: 'Nehemiah', chapters: 13 },
    { name: 'Esther', chapters: 10 },
    { name: 'Job', chapters: 42 },
    { name: 'Psalms', chapters: 150 },
    { name: 'Proverbs', chapters: 31 },
    { name: 'Ecclesiastes', chapters: 12 },
    { name: 'Song of Solomon', chapters: 8 },
    { name: 'Isaiah', chapters: 66 },
    { name: 'Jeremiah', chapters: 52 },
    { name: 'Lamentations', chapters: 5 },
    { name: 'Ezekiel', chapters: 48 },
    { name: 'Daniel', chapters: 12 },
    { name: 'Hosea', chapters: 14 },
    { name: 'Joel', chapters: 3 },
    { name: 'Amos', chapters: 9 },
    { name: 'Obadiah', chapters: 1 },
    { name: 'Jonah', chapters: 4 },
    { name: 'Micah', chapters: 7 },
    { name: 'Nahum', chapters: 3 },
    { name: 'Habakkuk', chapters: 3 },
    { name: 'Zephaniah', chapters: 3 },
    { name: 'Haggai', chapters: 2 },
    { name: 'Zechariah', chapters: 14 },
    { name: 'Malachi', chapters: 4 },
    { name: 'Matthew', chapters: 28 },
    { name: 'Mark', chapters: 16 },
    { name: 'Luke', chapters: 24 },
    { name: 'John', chapters: 21 },
    { name: 'Acts', chapters: 28 },
    { name: 'Romans', chapters: 16 },
    { name: '1 Corinthians', chapters: 16 },
    { name: '2 Corinthians', chapters: 13 },
    { name: 'Galatians', chapters: 6 },
    { name: 'Ephesians', chapters: 6 },
    { name: 'Philippians', chapters: 4 },
    { name: 'Colossians', chapters: 4 },
    { name: '1 Thessalonians', chapters: 5 },
    { name: '2 Thessalonians', chapters: 3 },
    { name: '1 Timothy', chapters: 6 },
    { name: '2 Timothy', chapters: 4 },
    { name: 'Titus', chapters: 3 },
    { name: 'Philemon', chapters: 1 },
    { name: 'Hebrews', chapters: 13 },
    { name: 'James', chapters: 5 },
    { name: '1 Peter', chapters: 5 },
    { name: '2 Peter', chapters: 3 },
    { name: '1 John', chapters: 5 },
    { name: '2 John', chapters: 1 },
    { name: '3 John', chapters: 1 },
    { name: 'Jude', chapters: 1 },
    { name: 'Revelation', chapters: 22 },
    // Sovereign Additions
    { name: 'Didascalia', chapters: 41 },
    { name: 'Apostolic Constitutions', chapters: 70 },
    { name: 'Gospel of Thomas', chapters: 114 },
    { name: 'Gospel of Truth', chapters: 19 },
    { name: 'Gospel of Philip', chapters: 68 }
];
// Helper to find files in the vault
const findSovereignFiles = (bookSlug, chapter) => {
    // Explicit mappings for special structures
    const specialMappings = {
        'gospel-of-thomas': {
            dir: '08-NagHammadi/GospelOfThomas',
            pattern: `Saying-${chapter}.md`
        },
        'gospel-of-truth': {
            dir: '08-NagHammadi/GospelOfTruth',
            pattern: `Section-${chapter}.md`
        },
        'gospel-of-philip': {
            dir: '08-NagHammadi/GospelOfPhilip',
            pattern: `Section-${chapter}.md`
        },
        'didascalia': {
            dir: '07-EthiopicApocrypha/73-Didascalica',
            pattern: `Didascalica-CH-${chapter}.md`
        },
        'apostolic-constitutions': {
            dir: '07-EthiopicApocrypha/72-ApostolicConstitutions/HornerStatutes',
            pattern: `HORNER-${chapter}-*.md`
        }
    };
    if (specialMappings[bookSlug]) {
        const mapping = specialMappings[bookSlug];
        const fullDir = path.join(SOVEREIGN_VAULT_PATH, mapping.dir);
        if (!fs.existsSync(fullDir))
            return null;
        if (mapping.pattern.includes('*')) {
            const prefix = mapping.pattern.split('*')[0];
            const suffix = mapping.pattern.split('*')[1];
            return fs.readdirSync(fullDir)
                .filter(f => f.startsWith(prefix) && f.endsWith(suffix))
                .sort((a, b) => {
                const aNum = parseInt(a.split('-').pop() || '0');
                const bNum = parseInt(b.split('-').pop() || '0');
                return aNum - bNum;
            })
                .map(f => path.join(fullDir, f));
        }
        const fullPath = path.join(fullDir, mapping.pattern);
        return fs.existsSync(fullPath) ? [fullPath] : null;
    }
    // Generic mapping for Standard/Deuterocanon/Ethiopic folders
    // Pattern: 0X-Category/XX-BookName/Chapter X/*.md
    const vaultDirs = ['01-Torah', '02-Historical', '03-Poetic', '04-Prophets', '05-Deuterocanonical', '06-NewTestament', '07-EthiopicApocrypha'];
    for (const vDir of vaultDirs) {
        const categoryPath = path.join(SOVEREIGN_VAULT_PATH, vDir);
        if (!fs.existsSync(categoryPath))
            continue;
        const books = fs.readdirSync(categoryPath);
        // Find book folder that matches slug (e.g. "68-Jubilees" matches "jubilees")
        const bookDir = books.find(b => b.toLowerCase().includes(bookSlug.replace(/-/g, '')));
        if (bookDir) {
            const chapterPath = path.join(categoryPath, bookDir, `Chapter ${chapter}`);
            if (fs.existsSync(chapterPath)) {
                return fs.readdirSync(chapterPath)
                    .filter(f => f.endsWith('.md'))
                    .sort((a, b) => {
                    // Sort by verse number (e.g. "1-1.md", "1-2.md")
                    const aVerse = parseInt(a.split('-').pop() || '0');
                    const bVerse = parseInt(b.split('-').pop() || '0');
                    return aVerse - bVerse;
                })
                    .map(f => path.join(chapterPath, f));
            }
        }
    }
    return null;
};
// Helper to parse verse text from markdown
const parseVerseFromMarkdown = (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Simple regex to strip frontmatter and return the body
        const body = content.split('---').pop()?.trim() || '';
        // Extract verse number from frontmatter if possible
        const verseMatch = content.match(/verse:\s*(\d+)/);
        const verseNum = verseMatch ? parseInt(verseMatch[1]) : 1;
        return {
            verse: verseNum,
            text: body.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
        };
    }
    catch (e) {
        return null;
    }
};
export const bibleRoutes = async (server) => {
    /**
     * GET /api/v1/bible/translations
     * List all available Bible translations
     */
    server.get('/translations', async (request, reply) => {
        return {
            success: true,
            data: availableTranslations
        };
    });
    /**
     * GET /api/v1/bible/books
     * List all books of the Bible
     */
    server.get('/books', async (request, reply) => {
        return {
            success: true,
            data: booksOfTheBible
        };
    });
    /**
     * GET /api/v1/bible/:book/:chapter
     * Get a specific chapter
     *
     * Query params:
     *   - translation: Bible translation (default: KJV)
     */
    server.get('/:book/:chapter', async (request, reply) => {
        const { book, chapter } = request.params;
        const chapterNum = parseInt(chapter);
        const translation = request.query.translation || 'KJV';
        // Check Sovereign Vault First
        const sovereignFiles = findSovereignFiles(book.toLowerCase(), chapterNum);
        if (sovereignFiles && sovereignFiles.length > 0) {
            const verses = sovereignFiles
                .map(f => parseVerseFromMarkdown(f))
                .filter(v => v !== null);
            return {
                success: true,
                data: {
                    reference: `${book} ${chapter}`,
                    translation: 'Sovereign Vault',
                    chapters: chapterNum,
                    verses: verses
                }
            };
        }
        // Fallback to Public API
        try {
            const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(book)}+${chapter}?translation=${translation}`);
            if (!response.ok) {
                return reply.status(404).send({
                    success: false,
                    error: 'Chapter not found'
                });
            }
            const data = await response.json();
            return {
                success: true,
                data: {
                    reference: data.reference,
                    translation: data.translation_name,
                    chapters: data.chapter,
                    verses: data.verses?.map((v) => ({
                        verse: v.verse,
                        text: v.text.replace(/\n/g, ' ').trim()
                    })) || []
                }
            };
        }
        catch (error) {
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch Bible chapter'
            });
        }
    });
    /**
     * GET /api/v1/bible/:book/:chapter/:verse
     * Get a specific verse
     */
    server.get('/:book/:chapter/:verse', async (request, reply) => {
        const { book, chapter, verse } = request.params;
        const translation = request.query.translation || 'KJV';
        // Check Sovereign Vault First
        const sovereignFiles = findSovereignFiles(book.toLowerCase(), parseInt(chapter));
        if (sovereignFiles) {
            const verseNum = parseInt(verse);
            const targetFile = sovereignFiles.find(f => f.includes(`-${verseNum}.md`));
            if (targetFile) {
                const parsed = parseVerseFromMarkdown(targetFile);
                if (parsed) {
                    return {
                        success: true,
                        data: {
                            reference: `${book} ${chapter}:${verse}`,
                            translation: 'Sovereign Vault',
                            book: book,
                            chapter: parseInt(chapter),
                            verse: verseNum,
                            text: parsed.text
                        }
                    };
                }
            }
        }
        try {
            const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(book)}+${chapter}:${verse}?translation=${translation}`);
            if (!response.ok) {
                return reply.status(404).send({
                    success: false,
                    error: 'Verse not found'
                });
            }
            const data = await response.json();
            return {
                success: true,
                data: {
                    reference: data.reference,
                    translation: data.translation_name,
                    book: data.book_name,
                    chapter: data.chapter,
                    verse: data.verse,
                    text: data.text.replace(/\n/g, ' ').trim()
                }
            };
        }
        catch (error) {
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch verse'
            });
        }
    });
    /**
     * GET /api/v1/bible/search
     * Search for a verse
     */
    server.get('/search', async (request, reply) => {
        return reply.status(501).send({
            success: false,
            error: 'Search not yet implemented. Use chapter endpoint to fetch full chapters.'
        });
    });
};
//# sourceMappingURL=bible.js.map