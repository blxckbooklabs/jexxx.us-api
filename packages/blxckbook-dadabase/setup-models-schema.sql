-- OnlyFinder Models Schema
-- The Sovereign Vault for Asset Intelligence

-- Create the models table
CREATE TABLE IF NOT EXISTS public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Core Identifiers
  of_username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  
  -- Visuals & Core Stats
  primary_image_url TEXT,
  location TEXT,
  fan_count INTEGER,
  
  -- Flexible Data Structures
  social_links JSONB DEFAULT '{}',
  scraped_metadata JSONB DEFAULT '{}',
  
  -- Discovery & Status
  discovered_on TEXT,
  status TEXT DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified', 'claimed')),
  
  -- The Sentient Layer
  luna_analysis TEXT,
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_by_user_id UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_models_of_username ON public.models(of_username);
CREATE INDEX IF NOT EXISTS idx_models_status ON public.models(status);
CREATE INDEX IF NOT EXISTS idx_models_location ON public.models(location);
CREATE INDEX IF NOT EXISTS idx_models_fan_count ON public.models(fan_count DESC);

-- Enable Row-Level Security (optional, for future multi-tenant scenarios)
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read models
CREATE POLICY "Allow public read on models" ON public.models
  FOR SELECT USING (true);

-- Policy: Only service role can insert/update/delete
CREATE POLICY "Service role full access on models" ON public.models
  FOR ALL USING (auth.role() = 'service_role');

-- User Blackbook Entries (saved models per user)
CREATE TABLE IF NOT EXISTS public.user_blackbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  user_id TEXT NOT NULL,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  
  -- User-specific data
  notes TEXT,
  tags TEXT[],
  
  UNIQUE(user_id, model_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_blackbook_user_id ON public.user_blackbook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blackbook_model_id ON public.user_blackbook_entries(model_id);

-- Enable RLS on user entries
ALTER TABLE public.user_blackbook_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own entries
CREATE POLICY "Users can see own entries" ON public.user_blackbook_entries
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can insert their own entries
CREATE POLICY "Users can insert own entries" ON public.user_blackbook_entries
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can delete their own entries
CREATE POLICY "Users can delete own entries" ON public.user_blackbook_entries
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);
