import { ChromaClient } from 'chromadb';
export declare const chromaClient: ChromaClient;
export interface DadabaseResult {
    content: string;
    shrine: string;
    title: string;
    score: number;
}
/**
 * Query the Dadabase (ChromaDB) for relevant context
 * @param query - The user's query to search for
 * @param shrine - Optional specific shrine to search (defaults to MANIFEST_SEXPERT)
 * @param topK - Number of results to return
 */
export declare function queryDadabase(query: string, shrine?: string, topK?: number): Promise<DadabaseResult[]>;
/**
 * List all available shrine collections
 */
export declare function listShrines(): Promise<string[]>;
