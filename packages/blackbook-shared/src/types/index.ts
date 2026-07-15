import type { SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  emailAddress?: string;
  primaryEmailAddress?: string;
  firstName?: string;
  lastName?: string;
  publicMetadata?: Record<string, unknown>;
}

export interface BlackbookConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  clerkPublishableKey: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface ApiContext {
  supabase: SupabaseClient;
  config: BlackbookConfig;
  auth: AuthState;
}

// Common type for error responses
export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

// Shared types for profile data
export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'connections-only';
  activityVisibility: 'public' | 'private' | 'connections-only';
}