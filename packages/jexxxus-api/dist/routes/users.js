import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
// Schema for user profile creation/update
const userProfileSchema = z.object({
    displayName: z.string().min(1).max(100),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
    preferences: z.object({
        theme: z.enum(['light', 'dark', 'system']),
        notifications: z.object({
            email: z.boolean(),
            push: z.boolean(),
            inApp: z.boolean(),
        }),
        privacy: z.object({
            profileVisibility: z.enum(['public', 'private', 'connections-only']),
            activityVisibility: z.enum(['public', 'private', 'connections-only']),
        }),
    }),
});
export const userRoutes = async (fastify) => {
    // Get user profile
    fastify.get('/:userId/profile', async (request, reply) => {
        const { userId } = request.params;
        if (userId !== request.userId) {
            return reply.status(403).send({ error: 'Unauthorized' });
        }
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error) {
            return reply.status(500).send({ error: error.message });
        }
        return data;
    });
    // Create or update user profile
    fastify.put('/:userId/profile', async (request, reply) => {
        const { userId } = request.params;
        if (userId !== request.userId) {
            return reply.status(403).send({ error: 'Unauthorized' });
        }
        try {
            const profile = userProfileSchema.parse(request.body);
            const { data, error } = await supabase
                .from('user_profiles')
                .upsert({
                user_id: userId,
                ...profile,
                updated_at: new Date().toISOString(),
            })
                .select()
                .single();
            if (error) {
                return reply.status(500).send({ error: error.message });
            }
            return data;
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ error: error.errors });
            }
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // Delete user profile
    fastify.delete('/:userId/profile', async (request, reply) => {
        const { userId } = request.params;
        if (userId !== request.userId) {
            return reply.status(403).send({ error: 'Unauthorized' });
        }
        const { error } = await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', userId);
        if (error) {
            return reply.status(500).send({ error: error.message });
        }
        return reply.status(204).send();
    });
};
//# sourceMappingURL=users.js.map