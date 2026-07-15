
import { ChromaClient } from 'chromadb';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Adjust path to root .env if needed

// Initialize clients
const chromaHost = process.env.CHROMADB_HOST || 'http://localhost:8000';
const chroma = new ChromaClient({ path: chromaHost });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use Service Role for bulk writes

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('--- MAMAbase Enrichment: ChromaDB -> Supabase ---');

    try {
        // 1. List all collections (shrines)
        const collections = await chroma.listCollections();
        console.log(`Found ${collections.length} shrines in Dadabase.`);

        for (const col of collections) {
            const collectionName = typeof col === 'string' ? col : col.name;
            console.log(`Processing shrine: ${collectionName}...`);

            const collection = await chroma.getCollection({ name: collectionName });

            // 2. Fetch all documents
            const result = await collection.get();

            if (!result.ids || result.ids.length === 0) {
                console.log(`  - Empty shrine. Skipping.`);
                continue;
            }

            const count = result.ids.length;
            console.log(`  - Found ${count} memories via 'get()'.`);

            // 3. Batched Insert into Supabase
            const batchSize = 100;
            const records: any[] = [];

            for (let i = 0; i < count; i++) {
                const doc = result.documents[i];
                const meta = result.metadatas[i] || {};
                const id = result.ids[i];

                if (!doc) continue;

                records.push({
                    title: (meta as any).title || `Memory from ${collectionName}`,
                    sacrament_type: 'TEXT',
                    content_text: doc,
                    intensity_score: (meta as any).shrine_rank ? parseInt((meta as any).shrine_rank) : 50, // Default to 50 if unknown
                    is_gated: false, // Default to open, can be updated later
                    metadata: {
                        source: 'dadabase_migration',
                        chroma_collection: collectionName,
                        chroma_id: id,
                        original_metadata: meta
                    }
                });

                if (records.length >= batchSize) {
                    const { error } = await supabase.from('sacraments').insert(records);
                    if (error) {
                        console.error(`  - Failed to insert batch:`, error);
                    } else {
                        process.stdout.write('.');
                    }
                    records.length = 0; // Clear batch
                }
            }

            // Insert remaining
            if (records.length > 0) {
                const { error } = await supabase.from('sacraments').insert(records);
                if (error) console.error(`  - Failed to insert final batch:`, error);
            }

            console.log(`\n  - Consecrated ${count} sacraments.`);
        }

        console.log('--- Migration Complete. The Goddess Brain is fed. ---');

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
