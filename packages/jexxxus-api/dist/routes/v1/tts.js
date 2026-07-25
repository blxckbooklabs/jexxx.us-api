/**
 * Public Edge TTS — same stack Hermes Desktop uses (`edge-tts` / Microsoft
 * neural voices via the Edge Read Aloud endpoint). Free, no API key.
 *
 * Routes (mounted at `/api/v1/tts`):
 *   GET  /health
 *   GET  /voices
 *   POST /          { text, voice?, speed? } → audio/mpeg
 *
 * Cache key: sha256(voice|rate|text) on local disk (Bible text is stable).
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
const DEFAULT_VOICE = "en-US-AriaNeural";
const MAX_TEXT = 5000; // matches Hermes edge-tts practical limit
const BACKEND = "edge-tts";
/** Curated English neural set (Hermes default Aria first). */
const VOICES = [
    { id: "en-US-AriaNeural", name: "Aria (US Female)", gender: "female", locale: "en-US" },
    { id: "en-US-JennyNeural", name: "Jenny (US Female)", gender: "female", locale: "en-US" },
    { id: "en-US-GuyNeural", name: "Guy (US Male)", gender: "male", locale: "en-US" },
    { id: "en-US-DavisNeural", name: "Davis (US Male)", gender: "male", locale: "en-US" },
    { id: "en-US-JaneNeural", name: "Jane (US Female)", gender: "female", locale: "en-US" },
    { id: "en-GB-SoniaNeural", name: "Sonia (UK Female)", gender: "female", locale: "en-GB" },
    { id: "en-GB-RyanNeural", name: "Ryan (UK Male)", gender: "male", locale: "en-GB" },
    { id: "en-AU-NatashaNeural", name: "Natasha (AU Female)", gender: "female", locale: "en-AU" },
    { id: "en-AU-WilliamNeural", name: "William (AU Male)", gender: "male", locale: "en-AU" },
];
const ALLOWED_VOICE_IDS = new Set(VOICES.map((v) => v.id));
const requestSchema = z.object({
    text: z.string().min(1).max(MAX_TEXT),
    /** Accept legacy Kokoro ids (`af`) and full Edge names. */
    voice: z.string().min(1).max(80).default(DEFAULT_VOICE),
    /** Playback multiplier — 0.5 slow … 2.0 fast (maps to Edge prosody rate %). */
    speed: z.number().min(0.5).max(2).default(1),
});
function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
/** Map 0.5–2.0 multiplier → Edge prosody rate string, e.g. "+0%", "-20%". */
export function speedToEdgeRate(speed) {
    const pct = Math.round((speed - 1) * 100);
    if (pct === 0)
        return "+0%";
    return pct > 0 ? `+${pct}%` : `${pct}%`;
}
function resolveVoice(voice) {
    const trimmed = voice.trim();
    // Accept curated ids, or any *Neural name (future / advanced clients).
    if (ALLOWED_VOICE_IDS.has(trimmed))
        return trimmed;
    if (/^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9]+Neural$/u.test(trimmed))
        return trimmed;
    // Legacy Kokoro ids from bible.jexxx.us → Aria
    if (trimmed === "af" || trimmed.startsWith("af_") || trimmed.startsWith("am_")) {
        return DEFAULT_VOICE;
    }
    return DEFAULT_VOICE;
}
function cacheDir() {
    const configured = process.env.JEXXXUS_TTS_CACHE_DIR?.trim();
    if (configured)
        return configured;
    return path.join(os.tmpdir(), "jexxxus-tts-cache");
}
function cacheKey(voice, rate, text) {
    return createHash("sha256").update(`${voice}|${rate}|${text}`, "utf8").digest("hex");
}
async function ensureCacheDir() {
    const dir = cacheDir();
    await fs.mkdir(dir, { recursive: true });
    return dir;
}
async function readCache(key) {
    try {
        const file = path.join(cacheDir(), `${key}.mp3`);
        return await fs.readFile(file);
    }
    catch {
        return null;
    }
}
async function writeCache(key, buf) {
    try {
        const dir = await ensureCacheDir();
        const file = path.join(dir, `${key}.mp3`);
        await fs.writeFile(file, buf);
    }
    catch (err) {
        console.warn("[TTS] cache write failed:", err instanceof Error ? err.message : err);
    }
}
async function synthesizeEdge(text, voice, speed) {
    const rate = speedToEdgeRate(speed);
    const key = cacheKey(voice, rate, text);
    const hit = await readCache(key);
    if (hit && hit.length > 0) {
        return hit;
    }
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    // Collect MP3 bytes from Edge Read Aloud websocket stream.
    const { audioStream } = tts.toStream(escapeXml(text), { rate });
    const chunks = await new Promise((resolve, reject) => {
        const out = [];
        let settled = false;
        const finish = () => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve(out);
        };
        const fail = (err) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(err instanceof Error ? err : new Error(String(err)));
        };
        const timer = setTimeout(() => fail(new Error("Edge TTS timeout (45s)")), 45_000);
        audioStream.on("data", (chunk) => {
            out.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        audioStream.on("error", fail);
        audioStream.on("close", finish);
        audioStream.on("end", finish);
    });
    const buf = Buffer.concat(chunks);
    if (buf.length === 0) {
        throw new Error("Edge TTS returned empty audio");
    }
    await writeCache(key, buf);
    return buf;
}
export const ttsRoutes = async (fastify) => {
    fastify.get("/health", async () => {
        return {
            status: "ok",
            backend: BACKEND,
            defaultVoice: DEFAULT_VOICE,
            maxText: MAX_TEXT,
            cacheDir: cacheDir(),
            voices: VOICES.map((v) => ({ id: v.id, name: v.name, gender: v.gender })),
        };
    });
    fastify.get("/voices", async () => {
        return {
            backend: BACKEND,
            defaultVoice: DEFAULT_VOICE,
            voices: VOICES.map((v) => ({
                id: v.id,
                name: v.name,
                gender: v.gender,
                locale: v.locale,
            })),
        };
    });
    fastify.post("/", async (request, reply) => {
        try {
            const body = requestSchema.parse(request.body ?? {});
            const voice = resolveVoice(body.voice);
            const { text, speed } = body;
            const rate = speedToEdgeRate(speed);
            fastify.log.info(`[TTS] edge voice=${voice} rate=${rate} chars=${text.length}`);
            const audioBuffer = await synthesizeEdge(text, voice, speed);
            reply.type("audio/mpeg");
            reply.header("Content-Disposition", "inline");
            reply.header("Cache-Control", "public, max-age=86400");
            reply.header("X-Voice", voice);
            reply.header("X-Speed", String(speed));
            reply.header("X-Edge-Rate", rate);
            reply.header("X-Backend", BACKEND);
            return reply.send(audioBuffer);
        }
        catch (error) {
            fastify.log.error({ err: error }, "[TTS] Error");
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: "Validation error",
                    details: error.errors,
                });
            }
            return reply.status(500).send({
                error: "Failed to generate audio",
                message: error instanceof Error ? error.message : "Unknown error",
                backend: BACKEND,
            });
        }
    });
};
//# sourceMappingURL=tts.js.map