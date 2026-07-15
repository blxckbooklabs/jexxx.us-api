/**
 * Complexity Heuristic for Hybrid RAG Activation
 * 
 * Determines whether a query should trigger RAG (Dadabase lookup)
 * based on semantic complexity indicators.
 */

const COMPLEX_KEYWORDS = [
    'how', 'why', 'explain', 'what is', 'what are',
    'difference', 'compare', 'relationship', 'attachment',
    'should i', 'help me', 'understand', 'meaning',
    'recommend', 'suggest', 'advice', 'opinion'
];

const MIN_LENGTH_FOR_AUTO_RAG = 50;

/**
 * Determine if a query is complex enough to warrant RAG activation
 * @param query - The user's input query
 * @returns true if RAG should be activated
 */
export function isComplexQuery(query: string): boolean {
    const normalized = query.toLowerCase().trim();

    // Check for complex keywords
    const hasComplexKeyword = COMPLEX_KEYWORDS.some(kw => normalized.includes(kw));

    // Short queries need keywords to trigger RAG
    if (normalized.length < MIN_LENGTH_FOR_AUTO_RAG) {
        return hasComplexKeyword;
    }

    // Longer queries or those with question marks + keywords
    return normalized.includes('?') || hasComplexKeyword;
}

/**
 * Parse command overrides from the query
 * @param query - The user's input query
 * @returns Parsed command info
 */
export function parseQueryCommands(query: string): {
    cleanQuery: string;
    override: 'wisdom' | 'fast' | null;
    mode: string | null;
} {
    let cleanQuery = query.trim();
    let override: 'wisdom' | 'fast' | null = null;
    let mode: string | null = null;

    // Check for /wisdom override (force RAG)
    if (cleanQuery.startsWith('/wisdom ')) {
        override = 'wisdom';
        cleanQuery = cleanQuery.slice(8).trim();
    }
    // Check for /fast override (skip RAG)
    else if (cleanQuery.startsWith('/fast ')) {
        override = 'fast';
        cleanQuery = cleanQuery.slice(6).trim();
    }

    // Check for /mode <agent> command
    const modeMatch = cleanQuery.match(/^\/mode\s+(\w+)\s*/);
    if (modeMatch) {
        mode = modeMatch[1].toLowerCase();
        cleanQuery = cleanQuery.slice(modeMatch[0].length).trim();
    }

    return { cleanQuery, override, mode };
}
