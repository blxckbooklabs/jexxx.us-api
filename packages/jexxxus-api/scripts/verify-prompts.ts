import { langfuse } from '../src/lib/langfuse.js';

async function verify() {
    console.log('--- Verifying Prompt Connectivity ---');
    try {
        const prompt = await langfuse.getPrompt('solomon-persona', 'latest');
        console.log('Success! Fetched solomon-persona:');
        console.log(prompt.getPrompt().substring(0, 100) + '...');
    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify().catch(console.error);
