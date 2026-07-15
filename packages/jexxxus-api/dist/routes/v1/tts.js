// Use any for request/response types to bypass TypeScript issues
import { z } from 'zod';
import { HfInference } from '@huggingface/inference';
const requestSchema = z.object({
    text: z.string().min(1).max(5000),
    voice: z.enum(['af', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'am_adam', 'am_ichael']).default('af'),
    speed: z.number().min(0.5).max(2).default(1),
});
// Available voices - Kokoro has 7 voices
const voices = [
    { id: 'af', name: 'Default (Female)', gender: 'female' },
    { id: 'af_bella', name: 'Bella (Female)', gender: 'female' },
    { id: 'af_nicole', name: 'Nicole (Female)', gender: 'female' },
    { id: 'af_sarah', name: 'Sarah (Female)', gender: 'female' },
    { id: 'af_sky', name: 'Sky (Female)', gender: 'female' },
    { id: 'am_adam', name: 'Adam (Male)', gender: 'male' },
    { id: 'am_ichael', name: 'Michael (Male)', gender: 'male' },
];
// Hugging Face Inference client - uses HF_TOKEN from environment
const HF_API_KEY = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
const HF_MODEL_ID = 'hexgrad/Kokoro-82M';
let hfClient = null;
function getHFClient() {
    if (!hfClient) {
        if (!HF_API_KEY) {
            throw new Error('HF_TOKEN or HUGGINGFACE_API_KEY environment variable not set');
        }
        hfClient = new HfInference(HF_API_KEY);
    }
    return hfClient;
}
// Voice mapping for HF inference
const voiceMapping = {
    'af': 'af',
    'af_bella': 'af_bella',
    'af_nicole': 'af_nicole',
    'af_sarah': 'af_sarah',
    'af_sky': 'af_sky',
    'am_adam': 'am_adam',
    'am_ichael': 'am_ichael',
};
async function generateSpeechViaHF(text, voice, speed = 1.0) {
    try {
        const client = getHFClient();
        const mappedVoice = voiceMapping[voice] || 'af';
        // Call HF text_to_speech - returns audio as Blob
        // @huggingface/inference SDK: textToSpeech(args) where model is in args
        const audioBlob = await client.textToSpeech({
            inputs: text,
            model: HF_MODEL_ID,
        });
        // Convert Blob to Buffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    catch (error) {
        console.error('[TTS/HF] Error:', error);
        throw error;
    }
}
export const ttsRoutes = async (fastify) => {
    // Health check endpoint
    fastify.get('/api/v1/tts/health', async (request, reply) => {
        const hfAvailable = !!HF_API_KEY;
        return {
            status: hfAvailable ? 'ok' : 'error',
            backend: 'huggingface-inference',
            model: HF_MODEL_ID,
            hfToken: hfAvailable ? 'configured' : 'missing',
            voices: voices.map(v => ({ id: v.id, name: v.name, gender: v.gender })),
        };
    });
    // List available voices
    fastify.get('/api/v1/tts/voices', async (request, reply) => {
        return {
            backend: 'huggingface-inference',
            model: HF_MODEL_ID,
            voices: voices.map(v => ({
                id: v.id,
                name: v.name,
                gender: v.gender,
            })),
        };
    });
    // TTS endpoint - generate audio from text via HF Inference API
    fastify.post('/api/v1/tts', async (request, reply) => {
        try {
            const body = requestSchema.parse(request.body);
            const { text, voice, speed } = body;
            fastify.log.info(`[TTS] Generating audio via HF: "${text.substring(0, 50)}..." with voice: ${voice}`);
            // Generate speech via HF Inference API
            const audioBuffer = await generateSpeechViaHF(text, voice, speed);
            // Set headers for audio response
            reply.type('audio/mpeg');
            reply.header('Content-Disposition', 'inline');
            reply.header('X-Voice', voice);
            reply.header('X-Speed', speed.toString());
            reply.header('X-Backend', 'huggingface-inference');
            return reply.send(audioBuffer);
        }
        catch (error) {
            fastify.log.error('[TTS] Error:', error);
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: 'Validation error',
                    details: error.errors,
                });
            }
            return reply.status(500).send({
                error: 'Failed to generate audio',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
};
//# sourceMappingURL=tts.js.map