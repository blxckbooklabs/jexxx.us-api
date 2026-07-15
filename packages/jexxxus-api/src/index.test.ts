// Test-mode server - minimal setup for intake validation only
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { intakeRoutes } from './routes/intake.js';

const server = Fastify({
    logger: true,
});

// Register CORS
server.register(cors, {
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173', // JEXXXUS local dev
        'https://blackbook.love',
        'https://admin.blackbook.love',
        'https://jexxxus.com',
        'https://www.jexxxus.com',
    ],
    credentials: true,
});

// Public routes (no auth required)
server.register(intakeRoutes, { prefix: '/api/intake' });

// Health check endpoint (public)
server.get('/health', async () => {
    return { status: 'ok', mode: 'TEST' };
});

const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
        await server.listen({ port, host: '0.0.0.0' });
        console.log('');
        console.log('╔══════════════════════════════════════════╗');
        console.log('║   BLACKBOOK API - TEST MODE              ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log(`Server listening on port ${port}`);
        console.log('');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
