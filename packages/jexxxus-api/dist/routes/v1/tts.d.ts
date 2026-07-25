type FastifyInstance = any;
/** Map 0.5–2.0 multiplier → Edge prosody rate string, e.g. "+0%", "-20%". */
export declare function speedToEdgeRate(speed: number): string;
export declare const ttsRoutes: (fastify: FastifyInstance) => Promise<void>;
export {};
