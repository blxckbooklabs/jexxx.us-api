-- Database setup for Enhanced Profile System
-- This schema implements all the profile-related tables with appropriate relationships and indexes

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tagline TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  cover_image_url TEXT,
  pronouns TEXT,
  location TEXT,
  birthday DATE,
  zodiac_sign TEXT,
  show_zodiac_sign BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  
  -- Profile customization as JSONB
  customization JSONB NOT NULL DEFAULT '{
    "showRelationshipLevel": true,
    "showLastSeen": true,
    "profileLayout": "default"
  }'::JSONB,
  
  -- Constraints
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_display_name_idx ON user_profiles(display_name);

-- Create profile_sections table
CREATE TABLE IF NOT EXISTS profile_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL,
  section_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility_level INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Section customization as JSONB
  customization JSONB NOT NULL DEFAULT '{
    "isCollapsible": true,
    "defaultCollapsed": false,
    "display": "cards"
  }'::JSONB,
  
  -- Constraints
  CONSTRAINT profile_sections_profile_id_fkey FOREIGN KEY (profile_id)
    REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Create indexes for profile_sections
CREATE INDEX IF NOT EXISTS profile_sections_profile_id_idx ON profile_sections(profile_id);
CREATE INDEX IF NOT EXISTS profile_sections_visibility_idx ON profile_sections(visibility_level);

-- Create profile_items table
CREATE TABLE IF NOT EXISTS profile_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  content JSONB NOT NULL,
  metadata JSONB,
  tags TEXT[],
  visibility_level INTEGER NOT NULL DEFAULT 0,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  
  -- Constraints
  CONSTRAINT profile_items_section_id_fkey FOREIGN KEY (section_id)
    REFERENCES profile_sections(id) ON DELETE CASCADE
);

-- Create indexes for profile_items
CREATE INDEX IF NOT EXISTS profile_items_section_id_idx ON profile_items(section_id);
CREATE INDEX IF NOT EXISTS profile_items_visibility_idx ON profile_items(visibility_level);
CREATE INDEX IF NOT EXISTS profile_items_type_idx ON profile_items(type);
CREATE INDEX IF NOT EXISTS profile_items_tags_idx ON profile_items USING GIN (tags);

-- Create reactions table
CREATE TABLE IF NOT EXISTS profile_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT profile_reactions_item_id_fkey FOREIGN KEY (item_id)
    REFERENCES profile_items(id) ON DELETE CASCADE,
  CONSTRAINT profile_reactions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for reactions
CREATE INDEX IF NOT EXISTS profile_reactions_item_id_idx ON profile_reactions(item_id);
CREATE INDEX IF NOT EXISTS profile_reactions_user_id_idx ON profile_reactions(user_id);

-- Create relationships table
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  next_level_threshold INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_interaction TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  custom_label TEXT,
  
  -- Constraints
  CONSTRAINT relationships_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT relationships_target_user_id_fkey FOREIGN KEY (target_user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_relationship UNIQUE(user_id, target_user_id)
);

-- Create indexes for relationships
CREATE INDEX IF NOT EXISTS relationships_user_id_idx ON relationships(user_id);
CREATE INDEX IF NOT EXISTS relationships_target_user_id_idx ON relationships(target_user_id);
CREATE INDEX IF NOT EXISTS relationships_level_idx ON relationships(level);
CREATE INDEX IF NOT EXISTS relationships_status_idx ON relationships(status);

-- Create relationship_milestones table
CREATE TABLE IF NOT EXISTS relationship_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  media JSONB,
  
  -- Constraints
  CONSTRAINT relationship_milestones_relationship_id_fkey FOREIGN KEY (relationship_id)
    REFERENCES relationships(id) ON DELETE CASCADE
);

-- Create indexes for relationship_milestones
CREATE INDEX IF NOT EXISTS relationship_milestones_relationship_id_idx ON relationship_milestones(relationship_id);

-- Create shared_content table
CREATE TABLE IF NOT EXISTS shared_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  item_id UUID NOT NULL,
  section_id UUID,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  message TEXT,
  is_viewed BOOLEAN NOT NULL DEFAULT false,
  viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT shared_content_sender_id_fkey FOREIGN KEY (sender_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT shared_content_recipient_id_fkey FOREIGN KEY (recipient_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT shared_content_item_id_fkey FOREIGN KEY (item_id)
    REFERENCES profile_items(id) ON DELETE CASCADE,
  CONSTRAINT shared_content_section_id_fkey FOREIGN KEY (section_id)
    REFERENCES profile_sections(id) ON DELETE SET NULL
);

-- Create indexes for shared_content
CREATE INDEX IF NOT EXISTS shared_content_sender_id_idx ON shared_content(sender_id);
CREATE INDEX IF NOT EXISTS shared_content_recipient_id_idx ON shared_content(recipient_id);
CREATE INDEX IF NOT EXISTS shared_content_item_id_idx ON shared_content(item_id);

-- Create profile_notifications table
CREATE TABLE IF NOT EXISTS profile_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT profile_notifications_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for profile_notifications
CREATE INDEX IF NOT EXISTS profile_notifications_user_id_idx ON profile_notifications(user_id);
CREATE INDEX IF NOT EXISTS profile_notifications_created_at_idx ON profile_notifications(created_at);
CREATE INDEX IF NOT EXISTS profile_notifications_is_read_idx ON profile_notifications(is_read);

-- Create Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_sections_updated_at 
  BEFORE UPDATE ON profile_sections 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_items_updated_at 
  BEFORE UPDATE ON profile_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at 
  BEFORE UPDATE ON relationships 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create Row-Level Security Policies
-- Enable row level security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for user_profiles
CREATE POLICY user_profiles_users_see_own
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_profiles_users_update_own
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_profiles_users_insert_own
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for profile_sections
-- Users can see their own sections
CREATE POLICY profile_sections_users_see_own
  ON profile_sections FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

-- Users can see public sections or with the right relationship level
CREATE POLICY profile_sections_see_permitted
  ON profile_sections FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    profile_id IN (
      SELECT up.id FROM user_profiles up
      JOIN relationships r ON r.target_user_id = up.user_id
      WHERE r.user_id = auth.uid() AND r.level >= visibility_level
    )
  );

-- Users can only update their own sections
CREATE POLICY profile_sections_users_update_own
  ON profile_sections FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

-- Users can only insert sections for their own profile
CREATE POLICY profile_sections_users_insert_own
  ON profile_sections FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

-- Users can only delete their own sections
CREATE POLICY profile_sections_users_delete_own
  ON profile_sections FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

-- Similar policies for other tables...
-- (For brevity, full policies for all tables not included)

-- Create functions for relationship management
CREATE OR REPLACE FUNCTION add_relationship_points(
  relationship_id UUID,
  points_to_add INTEGER,
  action_type TEXT
) RETURNS VOID AS $$
DECLARE
  rel RECORD;
  next_level INTEGER;
  next_threshold INTEGER;
BEGIN
  -- Get the current relationship
  SELECT * INTO rel FROM relationships WHERE id = relationship_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Relationship not found';
  END IF;
  
  -- Update points
  UPDATE relationships 
  SET 
    points = points + points_to_add,
    last_interaction = NOW()
  WHERE id = relationship_id;
  
  -- Check if level up is needed
  SELECT * INTO rel FROM relationships WHERE id = relationship_id;
  
  -- Calculate next level and threshold
  SELECT 
    level, threshold INTO next_level, next_threshold
  FROM (
    SELECT level, threshold 
    FROM (
      VALUES 
        (1, 0),
        (2, 50),
        (3, 150),
        (4, 300),
        (5, 500),
        (6, 750)
    ) AS levels(level, threshold)
    WHERE threshold > rel.points
    ORDER BY threshold
    LIMIT 1
  ) subquery;
  
  -- If we found a next level that's higher than current
  IF next_level IS NOT NULL AND next_level > rel.level THEN
    UPDATE relationships 
    SET 
      level = next_level,
      next_level_threshold = next_threshold
    WHERE id = relationship_id;
    
    -- Create a level up notification
    INSERT INTO profile_notifications (
      user_id, type, title, message, data
    ) VALUES (
      rel.user_id, 
      'relationship_level_up',
      'Relationship Level Up!',
      'Your relationship has reached level ' || next_level,
      jsonb_build_object(
        'relationship_id', relationship_id,
        'new_level', next_level,
        'target_user_id', rel.target_user_id
      )
    );
    
    -- Add a milestone
    INSERT INTO relationship_milestones (
      relationship_id, type, description, points_awarded, achieved_at
    ) VALUES (
      relationship_id, 
      'level_up',
      'Reached relationship level ' || next_level,
      points_to_add, 
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
