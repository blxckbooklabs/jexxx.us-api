import assert from "node:assert/strict";
import { test } from "node:test";
import { findBook, findVerse, hasLocalBibleVault, looksLikeVerseReference, normalizeBookLookupKey, parseVerseReference, } from "../lib/bible.js";
import { bibleTool } from "../lib/blxckchat/tools/bible-tools.js";
import { fetchVerseFromWeb, loadLiveBibleCatalog } from "../lib/bible-web.js";
test("parseVerseReference accepts numbered books", () => {
    assert.deepEqual(parseVerseReference("1 John 1:9"), {
        bookName: "1 John",
        chapter: 1,
        verse: 9,
    });
    assert.deepEqual(parseVerseReference("1 Samuel 2:1"), {
        bookName: "1 Samuel",
        chapter: 2,
        verse: 1,
    });
    assert.deepEqual(parseVerseReference("Genesis 1 1"), {
        bookName: "Genesis",
        chapter: 1,
        verse: 1,
    });
});
test("parseVerseReference accepts multi-word super-canon titles", () => {
    assert.deepEqual(parseVerseReference("Gospel of Thomas 1:5"), {
        bookName: "Gospel of Thomas",
        chapter: 1,
        verse: 5,
    });
    assert.deepEqual(parseVerseReference("1 Enoch 1:1"), {
        bookName: "1 Enoch",
        chapter: 1,
        verse: 1,
    });
    assert.deepEqual(parseVerseReference("Song of Songs 1:2"), {
        bookName: "Song of Songs",
        chapter: 1,
        verse: 2,
    });
});
test("normalizeBookLookupKey matches spaced and compact numbered books", () => {
    assert.equal(normalizeBookLookupKey("1 Samuel"), "1samuel");
    assert.equal(normalizeBookLookupKey("1Samuel"), "1samuel");
    assert.equal(normalizeBookLookupKey("09-1Samuel"), "1samuel");
});
test("findBook resolves 1 Samuel from spaced reference", () => {
    if (!hasLocalBibleVault())
        return;
    const book = findBook("1 Samuel");
    assert.ok(book);
    assert.match(book.book, /1Samuel/i);
});
test("findVerse loads 1 Samuel 2:1 from vault", () => {
    if (!hasLocalBibleVault())
        return;
    const verse = findVerse("1 Samuel 2:1");
    assert.ok(verse, "expected 1 Samuel 2:1 in obsidian-bible vault");
    assert.equal(verse.book, "1 Samuel");
    assert.match(verse.text.toLowerCase(), /heart/);
});
test("looksLikeVerseReference rejects video series titles", () => {
    assert.equal(looksLikeVerseReference("Forgive Me Father"), false);
    assert.equal(looksLikeVerseReference("Forgive Me Father videos"), false);
});
test("bible_query redirects non-verse queries to tv_query", async () => {
    const raw = await bibleTool.execute({
        action: "query",
        query: "Forgive Me Father",
    });
    assert.match(raw, /does not look like a scripture reference/i);
    assert.match(raw, /tv_query/i);
});
test("bible_query returns formatted verse text for valid refs", async () => {
    const raw = await bibleTool.execute({
        action: "query",
        query: "Genesis 1:1",
    });
    if (raw.startsWith("No verse found"))
        return;
    assert.doesNotMatch(raw, /^\[/);
    assert.match(raw, /Genesis 1:1/);
});
test("live catalog exposes full super-canon", async () => {
    const books = await loadLiveBibleCatalog();
    assert.ok(books.length >= 120, `expected ~131 books, got ${books.length}`);
    assert.ok(books.some((b) => /thomas/i.test(b.name)));
    assert.ok(books.some((b) => /enoch/i.test(b.name)));
});
test("web corpus resolves Gospel of Thomas and 1 Enoch", async () => {
    const thomas = await fetchVerseFromWeb("Gospel of Thomas", 1, 1);
    assert.ok(thomas?.text, "Thomas 1:1");
    assert.match(thomas.book, /Thomas/i);
    const enoch = await fetchVerseFromWeb("1 Enoch", 1, 1);
    assert.ok(enoch?.text, "1 Enoch 1:1");
    assert.match(enoch.book, /Enoch/i);
});
test("web corpus resolves abbreviations and chapter fetch", async () => {
    const jn = await fetchVerseFromWeb("Jn", 3, 16);
    assert.ok(jn?.text, "Jn 3:16");
    assert.match(jn.book, /John/i);
    const { fetchChapterFromWeb } = await import("../lib/bible-web.js");
    const ch = await fetchChapterFromWeb("Genesis", 1);
    assert.ok(ch && ch.verses.length >= 20, `Genesis 1 verses: ${ch?.verses.length}`);
    assert.match(ch.verses[0].text, /beginning/i);
});
test("bible_query chapter action returns full chapter text", async () => {
    const raw = await bibleTool.execute({
        action: "chapter",
        query: "Genesis 1",
    });
    assert.match(raw, /Genesis 1/i);
    assert.match(raw, /In the beginning/i);
});
test("bible_query catalog action returns live titles", async () => {
    const raw = await bibleTool.execute({
        action: "catalog",
        canon: "Nag Hammadi",
    });
    assert.match(raw, /Gospel of Thomas/i);
    assert.match(raw, /super-canon catalog/i);
});
//# sourceMappingURL=bible-parse.test.js.map