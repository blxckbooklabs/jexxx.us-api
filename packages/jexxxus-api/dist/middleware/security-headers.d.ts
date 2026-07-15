/**
 * Baseline HTTP security headers for a public-facing API gateway.
 * Complements Clerk JWT verification — does not replace it.
 */
export declare function registerSecurityHeaders(server: any): Promise<void>;
