// Use any for request/response types to bypass TypeScript issues
import { z } from 'zod';
import { langfuse } from '../../lib/langfuse.js';
// Request validation
const oracleRequestSchema = z.object({
    messages: z.array(z.object({
        role: z.string(),
        content: z.string()
    })),
    model: z.string().optional(),
    temperature: z.number().optional()
});
export const solomonRoutes = async (server) => {
    /**
     * POST /api/v1/solomon/consult
     * The Sacred Channel to the Solomon Persona
     */
    server.post('/consult', async (request, reply) => {
        const traceId = `solomon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        try {
            const body = oracleRequestSchema.parse(request.body);
            const apiKey = process.env.X_AI_LUNA_VERDE || process.env.X_AI_SOLOMON;
            if (!apiKey) {
                throw new Error('Luna Verde is silent. (Missing API Key)');
            }
            // Trace the consultation
            const trace = langfuse.trace({
                id: traceId,
                name: 'Solomon Consultation',
                userId: 'architect',
                metadata: {
                    model: body.model || 'grok-beta'
                }
            });
            const span = trace.span({
                name: 'X.AI Request',
                input: { messages: body.messages }
            });
            // Call X.AI (Grok/Solomon)
            // Standard OpenAI-compatible endpoint for X.AI
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    messages: body.messages,
                    model: body.model || "grok-beta",
                    stream: false,
                    temperature: body.temperature || 0.7
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Solomon Refused: ${response.status} ${errorText}`);
            }
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content || "Solomon is meditating.";
            span.end({
                output: { answer }
            });
            trace.update({
                output: { answer }
            });
            return reply.send({
                answer,
                traceId,
                choices: data.choices,
                usage: data.usage
            });
        }
        catch (error) {
            server.log.error('Solomon Route Error:', error);
            return reply.status(500).send({
                error: error instanceof Error ? error.message : 'Oracle Failure',
                traceId
            });
        }
    });
};
//# sourceMappingURL=solomon.js.map