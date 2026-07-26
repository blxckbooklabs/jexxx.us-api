/** Human-readable verse block for BLXCKCHAT replies (not raw JSON). */
export function formatBibleVerseForChat(verse) {
    const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
    const canon = verse.canon ? ` · ${verse.canon}` : "";
    const src = verse.sourceType ? ` · via ${verse.sourceType}` : "";
    const text = verse.text.trim() || "(text unavailable)";
    const slug = verse.book.replace(/\s+/g, "-");
    const url = `https://bible.jexxx.us/${slug}/${verse.chapter}#v${verse.verse}`;
    return `${ref}${canon}${src}\n${text}\n${url}`;
}
//# sourceMappingURL=bible-format.js.map