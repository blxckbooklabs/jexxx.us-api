import { type AuthenticatedAccountSession } from "./account-session.js";
export declare function requireAccountSession(request: any, reply: any): Promise<AuthenticatedAccountSession | null>;
