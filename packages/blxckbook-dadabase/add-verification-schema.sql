-- Migration: Add Age Verification fields to user_profiles
-- Description: Adds tracking for 18+ age verification status and provider metadata (Veriff).

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS veriff_session_id TEXT,
ADD COLUMN IF NOT EXISTS verification_details JSONB;

-- Index for status lookups
CREATE INDEX IF NOT EXISTS user_profiles_verification_status_idx ON user_profiles(verification_status);
CREATE INDEX IF NOT EXISTS user_profiles_is_verified_idx ON user_profiles(is_verified);

-- Comments for documentation
COMMENT ON COLUMN user_profiles.verification_status IS 'Current status of identity verification (not_started, started, approved, declined, etc)';
COMMENT ON COLUMN user_profiles.is_verified IS 'Whether the user has successfully completed 18+ verification';
COMMENT ON COLUMN user_profiles.veriff_session_id IS 'Internal Veriff session ID for the most recent attempt';

