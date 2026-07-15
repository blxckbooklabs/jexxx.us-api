// Use any for request/response types to bypass TypeScript issues
import { z } from 'zod';
import { supabase } from '../../lib/supabase.js';
// Query params schema
const listModelsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(24),
    search: z.string().optional(),
    status: z.enum(['unverified', 'verified', 'claimed']).optional(),
    sort: z.enum(['fan_count', 'created_at', 'display_name']).default('fan_count'),
    order: z.enum(['asc', 'desc']).default('desc'),
});
export const modelsRoutes = async (server) => {
    /**
     * GET /api/v1/models
     * Paginated list of models for the OnlyFinder gallery
     */
    server.get('/', async (request, reply) => {
        try {
            const query = listModelsQuerySchema.parse(request.query);
            const { page, limit, search, status, sort, order } = query;
            const offset = (page - 1) * limit;
            // Build query
            let dbQuery = supabase
                .from('models')
                .select('*', { count: 'exact' });
            // Apply filters
            if (search) {
                dbQuery = dbQuery.or(`of_username.ilike.%${search}%,display_name.ilike.%${search}%,location.ilike.%${search}%`);
            }
            if (status) {
                dbQuery = dbQuery.eq('status', status);
            }
            // Apply sorting and pagination
            dbQuery = dbQuery
                .order(sort, { ascending: order === 'asc' })
                .range(offset, offset + limit - 1);
            const { data, count, error } = await dbQuery;
            if (error) {
                server.log.error('Models Query Error:', error);
                return reply.status(500).send({ error: 'Failed to fetch models' });
            }
            // Transform to frontend format
            const models = (data || []).map((m) => ({
                id: m.id,
                of_username: m.of_username,
                display_name: m.display_name,
                fan_count: m.fan_count,
                location: m.location,
                image_url: m.primary_image_url,
                status: m.status,
                social_links: m.social_links,
                luna_analysis: m.luna_analysis,
            }));
            return reply.send({
                data: models,
                meta: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                },
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ error: error.errors });
            }
            server.log.error('Models Route Error:', error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    });
    /**
     * GET /api/v1/models/:id
     * Single model detail for the Dossier panel
     */
    server.get('/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { data, error } = await supabase
                .from('models')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !data) {
                return reply.status(404).send({ error: 'Model not found' });
            }
            const model = {
                id: data.id,
                of_username: data.of_username,
                display_name: data.display_name,
                fan_count: data.fan_count,
                location: data.location,
                image_url: data.primary_image_url,
                status: data.status,
                social_links: data.social_links,
                luna_analysis: data.luna_analysis,
            };
            return reply.send(model);
        }
        catch (error) {
            server.log.error('Model Detail Error:', error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    });
};
//# sourceMappingURL=models.js.map