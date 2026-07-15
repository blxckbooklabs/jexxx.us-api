import { SupabaseClient } from '@supabase/supabase-js';
import type { BlackbookConfig } from '../types/index.js';

// Initialize Supabase client with configuration
export function createSupabaseClient(config: BlackbookConfig): SupabaseClient {
  return new SupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
}

// Format date consistently across the application
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Shared validation utilities
export const validators = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isStrongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonAlphas = /\W/.test(password);
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonAlphas;
  }
};

// Error handling utilities
export class BlackbookError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BlackbookError';
  }
}

export function isBlackbookError(error: unknown): error is BlackbookError {
  return error instanceof BlackbookError;
}

// Storage utilities
export const storage = {
  getItem: (key: string): unknown => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: unknown): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to save to localStorage');
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      console.error('Failed to remove from localStorage');
    }
  }
};