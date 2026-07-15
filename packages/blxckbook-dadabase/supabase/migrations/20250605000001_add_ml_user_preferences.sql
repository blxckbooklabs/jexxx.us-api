-- Migration to add user ML preferences table
-- Executed on: 2025-06-05

-- Create user ML preferences table
CREATE TABLE IF NOT EXISTS user_ml_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  journal_analysis_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  contact_analysis_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  content_recommendations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_assistant_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_data_collection BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for user preferences
CREATE INDEX IF NOT EXISTS user_ml_preferences_user_id_idx ON user_ml_preferences(user_id);

-- Create function to update the updated_at column (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_ml_preferences
DROP TRIGGER IF EXISTS update_user_ml_preferences_updated_at ON user_ml_preferences;
CREATE TRIGGER update_user_ml_preferences_updated_at
BEFORE UPDATE ON user_ml_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to get user ML preferences with defaults
CREATE OR REPLACE FUNCTION get_user_ml_preferences(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  user_preferences JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'journal_analysis_enabled', journal_analysis_enabled,
      'contact_analysis_enabled', contact_analysis_enabled,
      'content_recommendations_enabled', content_recommendations_enabled,
      'ai_assistant_enabled', ai_assistant_enabled,
      'allow_data_collection', allow_data_collection
    ) INTO user_preferences
  FROM user_ml_preferences
  WHERE user_id = user_id_param;
  
  -- If no preferences exist, create default preferences
  IF user_preferences IS NULL THEN
    INSERT INTO user_ml_preferences (user_id)
    VALUES (user_id_param)
    RETURNING jsonb_build_object(
      'journal_analysis_enabled', journal_analysis_enabled,
      'contact_analysis_enabled', contact_analysis_enabled,
      'content_recommendations_enabled', content_recommendations_enabled,
      'ai_assistant_enabled', ai_assistant_enabled,
      'allow_data_collection', allow_data_collection
    ) INTO user_preferences;
  END IF;
  
  RETURN user_preferences;
END;
$$ LANGUAGE plpgsql;

-- Row-level security for ML preferences
ALTER TABLE user_ml_preferences ENABLE ROW LEVEL SECURITY;

-- Only allow users to see and modify their own preferences
CREATE POLICY user_ml_preferences_select_policy ON user_ml_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY user_ml_preferences_insert_policy ON user_ml_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_ml_preferences_update_policy ON user_ml_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_ml_preferences TO authenticated;
