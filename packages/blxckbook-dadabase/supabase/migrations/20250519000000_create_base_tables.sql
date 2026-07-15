-- Base schema for the Blackbook application
-- This migration creates all core tables referenced by later migrations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Journal Entries
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  tags TEXT[],
  sentiment FLOAT,
  topics JSONB,
  is_private BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT journal_entries_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS journal_entries_created_at_idx ON journal_entries(created_at);
CREATE INDEX IF NOT EXISTS journal_entries_tags_idx ON journal_entries USING GIN (tags);

-- ============================================================
-- Contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  tags TEXT[],
  importance INTEGER DEFAULT 0,
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);
CREATE INDEX IF NOT EXISTS contacts_name_idx ON contacts(name);
CREATE INDEX IF NOT EXISTS contacts_tags_idx ON contacts USING GIN (tags);

-- ============================================================
-- Contact Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  tone TEXT,
  topics TEXT[],
  follow_up_suggestions TEXT,
  CONSTRAINT contact_notes_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT contact_notes_contact_id_fkey FOREIGN KEY (contact_id)
    REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS contact_notes_user_id_idx ON contact_notes(user_id);
CREATE INDEX IF NOT EXISTS contact_notes_contact_id_idx ON contact_notes(contact_id);

-- ============================================================
-- Conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  participants TEXT[] NOT NULL DEFAULT '{}',
  title TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at);

-- ============================================================
-- Account Links (admin <-> personal account connections)
-- ============================================================
CREATE TABLE IF NOT EXISTS account_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL UNIQUE,
  personal_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT account_links_admin_user_id_fkey FOREIGN KEY (admin_user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT account_links_personal_user_id_fkey FOREIGN KEY (personal_user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS account_links_admin_user_id_idx ON account_links(admin_user_id);
CREATE INDEX IF NOT EXISTS account_links_personal_user_id_idx ON account_links(personal_user_id);

-- ============================================================
-- Analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  contacts INTEGER DEFAULT 0,
  entries INTEGER DEFAULT 0,
  user_id UUID,
  custom_metrics JSONB,
  CONSTRAINT analytics_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS analytics_date_idx ON analytics(date);
CREATE INDEX IF NOT EXISTS analytics_user_id_idx ON analytics(user_id);

-- ============================================================
-- Feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  feedback_text TEXT NOT NULL,
  insight TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_category_idx ON feedback(category);
