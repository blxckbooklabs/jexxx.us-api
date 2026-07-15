import { Langfuse } from 'langfuse';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root if needed
dotenv.config();

const publicKey = process.env.LANGFUSE_PUBLIC_KEY || '';
const secretKey = process.env.LANGFUSE_SECRET_KEY || '';
const baseUrl = process.env.LANGFUSE_HOST || 'http://localhost:3000';

if (!publicKey || !secretKey) {
    console.warn('Langfuse credentials missing. Sovereign Nervous System is partially offline.');
}

export const langfuse = new Langfuse({
    publicKey,
    secretKey,
    baseUrl,
    flushAt: 1, // Flush immediately for dev/debugging
});

export default langfuse;
