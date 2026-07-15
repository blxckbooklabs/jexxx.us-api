import { FastifyInstance } from 'fastify';
import { langfuse } from '../lib/langfuse.js';

// Color thresholds for diagram styling
const getHealthColor = (successRate: number): string => {
    if (successRate >= 95) return '#10b981'; // green
    if (successRate >= 80) return '#f59e0b'; // yellow
    return '#ef4444'; // red
};

const getLatencyColor = (avgMs: number): string => {
    if (avgMs <= 100) return '#10b981'; // green
    if (avgMs <= 500) return '#f59e0b'; // yellow
    return '#ef4444'; // red
};

export const observabilityRoutes = async (server: FastifyInstance) => {
    /**
     * GET /api/obs/trace/:id/score
     * Paternal Nervous-Visual Proxy - Fetches real-time trace scores
     */
    server.get('/trace/:id/score', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            // @ts-ignore - api.trace.get is part of the Langfuse client
            const trace = await langfuse.api.trace.get(id);

            const priorityScores = ['clarity', 'rebal', 'quality', 'dominion'];
            const relevantScore = trace.scores?.find((s: any) => priorityScores.includes(s.name.toLowerCase()));

            return {
                traceId: id,
                score: relevantScore?.value || 0,
                name: relevantScore?.name || 'unknown',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            (server as any).log.error(`[Obs Proxy] Failed to fetch trace ${id}:`, error);
            return reply.status(404).send({
                error: 'Trace offline or ID invalid',
                traceId: id
            });
        }
    });

    /**
     * GET /api/obs/metrics/routes
     * API Cognitive Map data - Route performance summary for visualization
     */
    server.get('/metrics/routes', async (request, reply) => {
        try {
            // In production, this would query Langfuse for real trace data
            // For now, return structured mock data that matches the diagram needs
            const routeMetrics = [
                {
                    route: '/api/intake',
                    avgLatency: 45,
                    requestCount: 127,
                    errorRate: 0.02,
                    tokenCost: 0,
                    color: getLatencyColor(45),
                },
                {
                    route: '/api/v1/models',
                    avgLatency: 82,
                    requestCount: 543,
                    errorRate: 0.01,
                    tokenCost: 0,
                    color: getLatencyColor(82),
                },
                {
                    route: '/api/users',
                    avgLatency: 156,
                    requestCount: 89,
                    errorRate: 0.03,
                    tokenCost: 0,
                    color: getLatencyColor(156),
                },
                {
                    route: '/api/obs',
                    avgLatency: 23,
                    requestCount: 1024,
                    errorRate: 0.001,
                    tokenCost: 0,
                    color: getLatencyColor(23),
                },
            ];

            // Format for diagram consumption
            const diagramData = {
                intake_rps: (routeMetrics[0].requestCount / 3600).toFixed(2),
                intake_latency: routeMetrics[0].avgLatency,
                models_rps: (routeMetrics[1].requestCount / 3600).toFixed(2),
                models_latency: routeMetrics[1].avgLatency,
                auth_rps: (routeMetrics[2].requestCount / 3600).toFixed(2),
                auth_latency: routeMetrics[2].avgLatency,
                auth_cost_usd: '0.00',
            };

            return {
                routes: routeMetrics,
                diagramData,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            (server as any).log.error('[Obs Metrics] Routes metrics error:', error);
            return reply.status(500).send({ error: 'Failed to fetch route metrics' });
        }
    });

    /**
     * GET /api/obs/metrics/pipeline
     * Intelligence Funnel data - OnlyFinder pipeline health
     */
    server.get('/metrics/pipeline', async (request, reply) => {
        try {
            // Pipeline stage metrics (mock for initial implementation)
            const stages = {
                scraper: { successCount: 245, errorCount: 12, dataVolume: 2340 },
                ingestion: { successCount: 233, errorCount: 5, dataVolume: 2280 },
                vault: { successCount: 228, errorCount: 0, dataVolume: 2280 },
                dashboard: { successCount: 1456, errorCount: 23, dataVolume: 0 },
                blackbook: { successCount: 89, errorCount: 2, dataVolume: 0 },
            };

            const ingestSuccessRate = Math.round(
                (stages.ingestion.successCount / (stages.ingestion.successCount + stages.ingestion.errorCount)) * 100
            );
            const vaultSuccessRate = Math.round(
                (stages.vault.successCount / (stages.vault.successCount + stages.vault.errorCount)) * 100
            );

            // Format for diagram consumption
            const diagramData = {
                ingest_count: stages.scraper.successCount,
                success_rate: ingestSuccessRate,
                query_count: stages.dashboard.successCount,
                save_count: stages.blackbook.successCount,
                ingest_color: getHealthColor(ingestSuccessRate),
                vault_color: getHealthColor(vaultSuccessRate),
            };

            return {
                stages,
                diagramData,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            (server as any).log.error('[Obs Metrics] Pipeline metrics error:', error);
            return reply.status(500).send({ error: 'Failed to fetch pipeline metrics' });
        }
    });

    /**
     * GET /api/obs/trace/:id/timeline
     * Luna Invocation Trace - Sequence diagram timing data
     */
    server.get('/trace/:id/timeline', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            // In production, this would fetch actual trace spans from Langfuse
            // For now, return structured mock that matches the sequence diagram
            const timeline = {
                traceId: id,
                totalDurationMs: 2450,
                steps: [
                    { name: 'Frontend Request', startMs: 0, endMs: 50, latencyMs: 50 },
                    { name: 'API Gateway', startMs: 50, endMs: 120, latencyMs: 70 },
                    { name: 'Langfuse Trace Start', startMs: 120, endMs: 135, latencyMs: 15 },
                    { name: 'Luna Verde LLM Call', startMs: 135, endMs: 2200, latencyMs: 2065 },
                    { name: 'Langfuse Trace End', startMs: 2200, endMs: 2220, latencyMs: 20 },
                    { name: 'API Response', startMs: 2220, endMs: 2450, latencyMs: 230 },
                ],
                diagramData: {
                    api_latency: 70,
                    llm_latency: 2065,
                    trace_overhead: 35,
                    total_latency: 2450,
                },
            };

            return timeline;
        } catch (error) {
            (server as any).log.error(`[Obs Timeline] Failed to fetch timeline for ${id}:`, error);
            return reply.status(404).send({ error: 'Trace timeline not found' });
        }
    });

    /**
     * GET /api/obs/status
     * System health check
     */
    server.get('/status', async () => {
        return {
            status: 'online',
            archetype: 'Nervous Synapse',
            aetherius_lens: 'active',
            last_pulse: new Date().toISOString()
        };
    });
};

