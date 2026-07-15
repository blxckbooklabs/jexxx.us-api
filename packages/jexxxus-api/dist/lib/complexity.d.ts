/**
 * Complexity Heuristic for Hybrid RAG Activation
 *
 * Determines whether a query should trigger RAG (Dadabase lookup)
 * based on semantic complexity indicators.
 */
/**
 * Determine if a query is complex enough to warrant RAG activation
 * @param query - The user's input query
 * @returns true if RAG should be activated
 */
export declare function isComplexQuery(query: string): boolean;
/**
 * Parse command overrides from the query
 * @param query - The user's input query
 * @returns Parsed command info
 */
export declare function parseQueryCommands(query: string): {
    cleanQuery: string;
    override: 'wisdom' | 'fast' | null;
    mode: string | null;
};
