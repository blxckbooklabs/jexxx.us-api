import type { FastifyRequest } from 'fastify';
export interface UserParams {
    userId: string;
}
export interface UserProfileData {
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    preferences: {
        theme: 'light' | 'dark' | 'system';
        notifications: {
            email: boolean;
            push: boolean;
            inApp: boolean;
        };
        privacy: {
            profileVisibility: 'public' | 'private' | 'connections-only';
            activityVisibility: 'public' | 'private' | 'connections-only';
        };
    };
}
export type UserRequest = FastifyRequest;
