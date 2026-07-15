import { ChromaClient, DefaultEmbeddingFunction } from 'chromadb';

const chromaHost = process.env.CHROMADB_HOST || 'http://localhost:8000';

export const chromaClient = new ChromaClient({
    path: chromaHost
});

// Default embedding function for ChromaDB queries
const embeddingFunction = new DefaultEmbeddingFunction();

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
export async function queryDadabase(
    query: string,
    shrine?: string,
    topK = 3
): Promise<DadabaseResult[]> {
    try {
        const collectionName = shrine || 'MANIFEST_SEXPERT';
        const collection = await chromaClient.getCollection({
            name: collectionName,
            embeddingFunction
        });

        const results = await collection.query({
            queryTexts: [query],
            nResults: topK
        });

        if (!results.documents[0]) {
            return [];
        }

        return results.documents[0].map((doc, i) => ({
            content: doc || '',
            shrine: collectionName,
            title: (results.metadatas[0]?.[i] as any)?.title || 'Unknown',
            score: results.distances?.[0]?.[i] || 0
        }));
    } catch (error) {
        console.error('Dadabase query failed:', error);
        return [];
    }
}

/**
 * List all available shrine collections
 */
export async function listShrines(): Promise<string[]> {
    try {
        const collections = await chromaClient.listCollections();
        // Handle both old and new ChromaDB API formats
        return collections.map((c: any) => typeof c === 'string' ? c : c.name);
    } catch (error) {
        console.error('Failed to list shrines:', error);
        return [];
    }
}
