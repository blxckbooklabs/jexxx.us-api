-- Database setup for AI agent system

-- Create agent conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
  conversation_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS agent_conversations_user_id_idx ON agent_conversations (user_id);
CREATE INDEX IF NOT EXISTS agent_conversations_updated_at_idx ON agent_conversations (updated_at);

-- Create agent analytics table
CREATE TABLE IF NOT EXISTS agent_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS agent_analytics_user_id_idx ON agent_analytics (user_id);
CREATE INDEX IF NOT EXISTS agent_analytics_agent_id_idx ON agent_analytics (agent_id);
CREATE INDEX IF NOT EXISTS agent_analytics_timestamp_idx ON agent_analytics (timestamp);

-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
