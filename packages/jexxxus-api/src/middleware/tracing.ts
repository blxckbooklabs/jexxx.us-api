import { langfuse } from '../lib/langfuse.js';

export const tracingMiddleware = async (request: any, reply: any) => {
    const traceId = request.headers['x-trace-id'] as string;

    // Create a trace for the request
    const trace = langfuse.trace({
        id: traceId,
        name: `${request.method} ${request.url}`,
        userId: request.userId,
        metadata: {
            path: request.url,
            method: request.method,
        },
    });

    // Attach trace to request for use in handlers
    request.trace = trace;
};

export const tracingResponseHook = async (request: any, reply: any) => {
    if (request.trace) {
        // End the trace on response
        request.trace.update({
            output: {
                statusCode: reply.statusCode,
            },
        });
    }
};