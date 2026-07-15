// Use any for request/response types to bypass TypeScript issues
import { z } from 'zod';
import { langfuse } from '../../lib/langfuse.js';
import { queryDadabase } from '../../lib/chromadb.js';
import { isComplexQuery, parseQueryCommands } from '../../lib/complexity.js';
import { generateLunaResponse } from '../../lib/gemini.js';
// Request validation schema
const chatRequestSchema = z.object({
    query: z.string().min(1, 'Query cannot be empty'),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
    })).optional().default([]),
    model: z.enum(['luna', 'deepseek']).default('luna'),
    override: z.enum(['wisdom', 'fast']).optional(),
    mode: z.string().optional()
});
// DeepSeek fallback (Ollama)
async function generateDeepSeekResponse(query, conversationHistory = []) {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    try {
        const response = await fetch(`${ollamaHost}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-r1:7b',
                messages: [
                    ...conversationHistory.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    { role: 'user', content: query }
                ],
                stream: false
            })
        });
        const data = await response.json();
        return data.message?.content || 'DeepSeek did not return a response.';
    }
    catch (error) {
        console.error('DeepSeek (Ollama) call failed:', error);
        throw new Error('DeepSeek cognitive substrate is offline.');
    }
}
export const chatRoutes = async (server) => {
    /**
     * POST /api/v1/chat
     * The Sovereign Gateway - Central LLM communication endpoint
     */
    server.post('/', async (request, reply) => {
        const traceId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        try {
            // Validate request
            const body = chatRequestSchema.parse(request.body);
            // Parse commands from query
            const { cleanQuery, override, mode: parsedMode } = parseQueryCommands(body.query);
            const effectiveMode = body.mode || parsedMode;
            const effectiveOverride = body.override || override;
            // Create Langfuse trace
            const trace = langfuse.trace({
                id: traceId,
                name: 'Oracle Chat',
                userId: request.userId || 'architect',
                metadata: {
                    model: body.model,
                    mode: effectiveMode,
                    override: effectiveOverride,
                    queryLength: cleanQuery.length
                }
            });
            // Determine RAG activation
            let shouldRAG = false;
            if (effectiveOverride === 'wisdom') {
                shouldRAG = true;
            }
            else if (effectiveOverride === 'fast') {
                shouldRAG = false;
            }
            else {
                shouldRAG = isComplexQuery(cleanQuery);
            }
            // Query Dadabase if RAG active
            let sources = [];
            let contextString = null;
            if (shouldRAG) {
                const ragSpan = trace.span({
                    name: 'Dadabase RAG Query',
                    input: { query: cleanQuery }
                });
                sources = await queryDadabase(cleanQuery);
                if (sources.length > 0) {
                    contextString = sources
                        .map((s, i) => `[${i + 1}] ${s.title} (${s.shrine}):\n${s.content}`)
                        .join('\n\n');
                }
                ragSpan.end({
                    output: { sourcesFound: sources.length }
                });
            }
            // Generate response based on model
            let response;
            const llmSpan = trace.span({
                name: `LLM Generation (${body.model})`,
                input: { query: cleanQuery, mode: effectiveMode }
            });
            if (body.model === 'luna') {
                response = await generateLunaResponse(cleanQuery, body.conversationHistory, contextString, effectiveMode);
            }
            else {
                response = await generateDeepSeekResponse(cleanQuery, body.conversationHistory);
            }
            llmSpan.end({
                output: { responseLength: response.length }
            });
            // End trace
            trace.update({
                output: {
                    responseLength: response.length,
                    ragActivated: shouldRAG,
                    sourcesUsed: sources.length
                }
            });
            // Build response
            const chatResponse = {
                response,
                traceId,
                sources: sources.length > 0 ? sources.map(s => ({
                    shrine: s.shrine,
                    title: s.title,
                    score: s.score
                })) : null,
                model: body.model,
                mode: effectiveMode
            };
            return reply.send(chatResponse);
        }
        catch (error) {
            server.log.error('Chat Route Error:', error);
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: 'Invalid request',
                    details: error.errors,
                    traceId
                });
            }
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Internal Server Error',
                traceId
            });
        }
    });
    /**
     * GET /api/v1/chat/health
     * Health check for the chat subsystem
     */
    server.get('/health', async () => {
        return {
            status: 'online',
            subsystems: {
                luna: !!process.env.GEMINI_API_KEY,
                deepseek: true, // Assumes Ollama is available
                dadabase: !!process.env.CHROMADB_HOST || true,
                langfuse: !!process.env.LANGFUSE_PUBLIC_KEY
            }
        };
    });
};
//# sourceMappingURL=chat.js.map