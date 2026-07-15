import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    accessToken?: string;
    trace?: any; // Langfuse trace
  }
}

export interface UserRouteParams {
  userId: string;
}

export interface UserProfileBody {
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

export type UserProfileRequest = FastifyRequest;