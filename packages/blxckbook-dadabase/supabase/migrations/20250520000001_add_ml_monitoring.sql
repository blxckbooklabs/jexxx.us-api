-- Migration to add ML monitoring tables
-- Executed on: 2025-05-20

-- Create ML operations tracking table
CREATE TABLE IF NOT EXISTS ml_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL,
  content_id TEXT,
  content_type TEXT,
  duration_ms INTEGER,
  tokens_used INTEGER,
  error_message TEXT,
  api_provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS ml_operations_user_id_idx ON ml_operations(user_id);
CREATE INDEX IF NOT EXISTS ml_operations_created_at_idx ON ml_operations(created_at);
CREATE INDEX IF NOT EXISTS ml_operations_operation_type_idx ON ml_operations(operation_type);

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

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_ml_preferences
CREATE TRIGGER update_user_ml_preferences_updated_at
BEFORE UPDATE ON user_ml_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to get user ML preferences
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

-- Row-level security for ML operations
ALTER TABLE ml_operations ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own ML operations
CREATE POLICY ml_operations_select_policy ON ml_operations
  FOR SELECT
  USING (user_id = auth.uid());

-- Create ML usage summary view
CREATE OR REPLACE VIEW ml_usage_summary AS
SELECT
  user_id,
  DATE_TRUNC('day', created_at) AS day,
  operation_type,
  COUNT(*) AS operation_count,
  SUM(tokens_used) AS total_tokens_used,
  AVG(duration_ms) AS avg_duration_ms
FROM ml_operations
GROUP BY user_id, DATE_TRUNC('day', created_at), operation_type;

-- Grant access to authenticated users
GRANT SELECT ON ml_usage_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_ml_preferences TO authenticated;
