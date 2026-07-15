-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for storing journal vectors
CREATE TABLE IF NOT EXISTS journal_vectors (
  id UUID PRIMARY KEY REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,  -- OpenAI embedding dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Add any additional fields that might be useful for filtering
  sentiment FLOAT,
  primary_topics TEXT[]
);

-- Create a table for storing contact note vectors
CREATE TABLE IF NOT EXISTS contact_note_vectors (
  id UUID PRIMARY KEY REFERENCES contact_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, 
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Add any additional fields that might be useful
  tone TEXT,
  topics TEXT[],
  follow_up_suggestions TEXT
);

-- Create a table for storing conversation vectors (for chat/messages)
CREATE TABLE IF NOT EXISTS conversation_vectors (
  id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participants TEXT[] NOT NULL,  -- Array of participant IDs or names
  content TEXT NOT NULL,  -- This could be the conversation summary
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Add any additional fields that might be useful
  sentiment FLOAT,
  topics TEXT[]
);

-- Create indexes for faster vector similarity searches
CREATE INDEX ON journal_vectors USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);  -- Number of lists should be tuned based on data size

CREATE INDEX ON contact_note_vectors USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX ON conversation_vectors USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create a function to search for similar journal entries
CREATE OR REPLACE FUNCTION search_similar_journal_entries(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  user_id_filter UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  sentiment FLOAT,
  primary_topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jv.id,
    jv.user_id,
    jv.content,
    1 - (jv.embedding <=> query_embedding) AS similarity,
    jv.created_at,
    jv.sentiment,
    jv.primary_topics
  FROM journal_vectors jv
  WHERE jv.user_id = user_id_filter
    AND 1 - (jv.embedding <=> query_embedding) > match_threshold
  ORDER BY jv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create a function to search for similar contact notes
CREATE OR REPLACE FUNCTION search_similar_contact_notes(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  user_id_filter UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  contact_id UUID,
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  tone TEXT,
  topics TEXT[],
  follow_up_suggestions TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cnv.id,
    cnv.user_id,
    cnv.contact_id,
    cnv.content,
    1 - (cnv.embedding <=> query_embedding) AS similarity,
    cnv.created_at,
    cnv.tone,
    cnv.topics,
    cnv.follow_up_suggestions
  FROM contact_note_vectors cnv
  WHERE cnv.user_id = user_id_filter
    AND 1 - (cnv.embedding <=> query_embedding) > match_threshold
  ORDER BY cnv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create a function to search for similar conversations
CREATE OR REPLACE FUNCTION search_similar_conversations(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  user_id_filter UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  participants TEXT[],
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  sentiment FLOAT,
  topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id,
    cv.user_id,
    cv.participants,
    cv.content,
    1 - (cv.embedding <=> query_embedding) AS similarity,
    cv.created_at,
    cv.sentiment,
    cv.topics
  FROM conversation_vectors cv
  WHERE cv.user_id = user_id_filter
    AND 1 - (cv.embedding <=> query_embedding) > match_threshold
  ORDER BY cv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create a function to find related content across all vector tables
CREATE OR REPLACE FUNCTION search_related_content(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  user_id_filter UUID,
  include_journals BOOLEAN DEFAULT TRUE,
  include_contacts BOOLEAN DEFAULT TRUE,
  include_conversations BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content TEXT,
  title TEXT,
  preview TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 
      jv.id,
      'journal' AS content_type,
      jv.content,
      COALESCE(
        je.title, 
        SUBSTRING(jv.content FROM 1 FOR 30) || '...'
      ) AS title,
      SUBSTRING(jv.content FROM 1 FOR 100) || '...' AS preview,
      1 - (jv.embedding <=> query_embedding) AS similarity,
      jv.created_at
    FROM journal_vectors jv
    LEFT JOIN journal_entries je ON je.id = jv.id
    WHERE jv.user_id = user_id_filter
      AND 1 - (jv.embedding <=> query_embedding) > match_threshold
      AND include_journals = TRUE
  )
  UNION
  (
    SELECT 
      cnv.id,
      'contact' AS content_type,
      cnv.content,
      COALESCE(
        c.name, 
        'Contact Note'
      ) AS title,
      SUBSTRING(cnv.content FROM 1 FOR 100) || '...' AS preview,
      1 - (cnv.embedding <=> query_embedding) AS similarity,
      cnv.created_at
    FROM contact_note_vectors cnv
    LEFT JOIN contacts c ON c.id = cnv.contact_id
    WHERE cnv.user_id = user_id_filter
      AND 1 - (cnv.embedding <=> query_embedding) > match_threshold
      AND include_contacts = TRUE
  )
  UNION
  (
    SELECT 
      cv.id,
      'conversation' AS content_type,
      cv.content,
      ARRAY_TO_STRING(cv.participants, ', ') AS title,
      SUBSTRING(cv.content FROM 1 FOR 100) || '...' AS preview,
      1 - (cv.embedding <=> query_embedding) AS similarity,
      cv.created_at
    FROM conversation_vectors cv
    WHERE cv.user_id = user_id_filter
      AND 1 - (cv.embedding <=> query_embedding) > match_threshold
      AND include_conversations = TRUE
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create RLS Policies for security
ALTER TABLE journal_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_note_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own journal vectors"
  ON journal_vectors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can only access their own contact note vectors"
  ON contact_note_vectors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can only access their own conversation vectors"
  ON conversation_vectors
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
