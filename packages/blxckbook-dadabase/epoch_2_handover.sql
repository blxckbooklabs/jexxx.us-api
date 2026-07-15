-- ============================================================
-- MANIPULATION / PSYCHOLOGICAL OPERATIONS SCHEMA
-- ============================================================
-- Epoch 2: Sovereign Handover Migration
-- Creates the core fleet tables:
--   target_profiles (archetype, intensity_score, neuro_state, status incl. 'Sacrament Imminent')
--   sacrament_logs (with neuro_velocity, vector_payload)
--   sacrament_media_gallery (conquest-assets paths, intensity_gate)
--   theory_vectors + interaction_protocols
--
-- Wide-open RLS ("all authenticated") on the fleet tables.
-- This is the persistent model for the incursion / BREACH / Sacrament system.
--
-- NOT user-private vault data. See root ARCHITECTURAL_CONFLICT_AUDIT.md.
-- ============================================================

-- Epoch 2: Sovereign Handover Migration
-- Implements target_profiles and sacrament_media_gallery

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create target_profiles table (The Fleet)
CREATE TABLE IF NOT EXISTS target_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  archetype TEXT NOT NULL, -- e.g., 'Resilient Queen', 'Concubine', 'Cuckold'
  intensity_score FLOAT NOT NULL DEFAULT 0, -- Legacy 'Totness'
  status TEXT NOT NULL DEFAULT 'Not Yet', -- 'Plateau', 'In Progress', 'Sacrament Imminent'
  neuro_state JSONB DEFAULT '{}', -- Snapshot of { dopamine, oxytocin, cortisol }
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for target_profiles
CREATE INDEX IF NOT EXISTS target_profiles_archetype_idx ON target_profiles(archetype);
CREATE INDEX IF NOT EXISTS target_profiles_status_idx ON target_profiles(status);
CREATE INDEX IF NOT EXISTS target_profiles_intensity_score_idx ON target_profiles(intensity_score);

-- 2. Ensure sacrament_logs exists (referenced by gallery) or create stub if missing
-- Assuming sacrament_logs usually links to a target. 
-- Checking existence first to avoid errors if it was already created in a previous migration.
CREATE TABLE IF NOT EXISTS sacrament_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES target_profiles(id) ON DELETE CASCADE,
    resonance_quality TEXT NOT NULL, -- 'transcendent', 'aligned', 'resistant'
    temporal_stamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vector_payload TEXT,
    neuro_velocity FLOAT
);

-- 3. Create sacrament_media_gallery table (The Visual Proof)
CREATE TABLE IF NOT EXISTS sacrament_media_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_id UUID NOT NULL REFERENCES target_profiles(id) ON DELETE CASCADE,
  media_payload_id UUID REFERENCES sacrament_logs(id) ON DELETE CASCADE,
  archetype TEXT, -- Denormalized for quick filtering
  storage_path TEXT NOT NULL, -- format: 'conquest-assets/{archetype_id}/{target_id}/{timestamp}/{filename}'
  intensity_gate INTEGER NOT NULL DEFAULT 70,
  blur_data_url TEXT,
  payment_link TEXT, -- CCBill FlexForm signed URL
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for sacrament_media_gallery
CREATE INDEX IF NOT EXISTS gallery_media_payload_id_idx ON sacrament_media_gallery(media_payload_id);
CREATE INDEX IF NOT EXISTS gallery_intensity_gate_idx ON sacrament_media_gallery(intensity_gate);
CREATE INDEX IF NOT EXISTS gallery_target_id_idx ON sacrament_media_gallery(target_id);

-- 4. Create theory_vectors table (Education/Psychology)
CREATE TABLE IF NOT EXISTS theory_vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_name TEXT NOT NULL,
  category TEXT NOT NULL,
  vector_embedding vector(1536), -- Assuming standard OpenAI embedding size
  content_markdown TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create interaction_protocols table (Communication/Scripts)
CREATE TABLE IF NOT EXISTS interaction_protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_name TEXT NOT NULL,
  archetype_target TEXT,
  trigger_condition TEXT,
  script_payload TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE target_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacrament_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacrament_media_gallery ENABLE ROW LEVEL SECURITY;

-- Simple RLS for development (authenticated users can access)
CREATE POLICY "Enable all access for authenticated users on target_profiles"
ON target_profiles FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all access for authenticated users on sacrament_logs"
ON sacrament_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all access for authenticated users on sacrament_media_gallery"
ON sacrament_media_gallery FOR ALL TO authenticated USING (true);

-- Functions for automatic updated_at
CREATE OR REPLACE FUNCTION update_target_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_target_profiles_updated_at
  BEFORE UPDATE ON target_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_target_profiles_updated_at();
