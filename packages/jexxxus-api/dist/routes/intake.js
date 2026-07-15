import { z } from 'zod';
// import { supabase } from '../lib/supabase.js'; // Disabled for local testing
// Schema for JEXXXUS intake
const intakeSchema = z.object({
    stage_name: z.string().min(1).max(100),
    contact_method: z.string().min(1).max(255),
    raw_dossier: z.string().optional(),
    archetype: z.string().optional(),
    referral_source: z.string().optional().default('JEXXXUS'),
});
export const intakeRoutes = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            console.log('');
            console.log('╔══════════════════════════════════════════╗');
            console.log('║     SOVEREIGN INTAKE RECEIVED            ║');
            console.log('╚══════════════════════════════════════════╝');
            console.log('');
            console.log('Raw Request Body:', JSON.stringify(request.body, null, 2));
            console.log('');
            const submission = intakeSchema.parse(request.body);
            console.log('Validated Submission:', JSON.stringify(submission, null, 2));
            console.log('');
            console.log('═══════════════════════════════════════════');
            console.log('');
            // TODO: Re-enable Supabase insert after validation
            // For now, just confirm receipt
            return reply.status(200).send({
                status: 'success',
                message: 'Intake data received by API. Validation passed.',
                data: submission,
            });
        }
        catch (error) {
            console.error('');
            console.error('╔══════════════════════════════════════════╗');
            console.error('║     INTAKE VALIDATION FAILED             ║');
            console.error('╚══════════════════════════════════════════╝');
            console.error('Error:', error);
            console.error('');
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ error: error.errors });
            }
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    });
};
//# sourceMappingURL=intake.js.map