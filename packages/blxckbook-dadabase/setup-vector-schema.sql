-- Create a schema for vector operations
CREATE SCHEMA IF NOT EXISTS public;

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for storing embeddings
CREATE TABLE IF NOT EXISTS public.content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- e.g., 'contact', 'journal', etc.
  text_content TEXT NOT NULL,
  embedding VECTOR(1536) -- 1536 dimensions for OpenAI embeddings
);

-- Create a table for user preference/profile embeddings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY,
  embedding VECTOR(1536),
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Create an index for faster similarity search
CREATE INDEX IF NOT EXISTS content_embedding_idx 
ON public.content_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to get recommendations based on user preferences
CREATE OR REPLACE FUNCTION public.get_recommendations(
  user_id_param UUID,
  limit_param INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content_id UUID,
  content_type TEXT,
  text_content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content_id,
    e.content_type,
    e.text_content,
    1 - (e.embedding <=> (
      SELECT embedding FROM user_preferences WHERE user_id = user_id_param
    )) AS similarity
  FROM
    content_embeddings e
  WHERE EXISTS (
    SELECT 1 FROM user_preferences WHERE user_id = user_id_param
  )
  ORDER BY
    similarity DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to search content by similarity to a text query
CREATE OR REPLACE FUNCTION public.search_content_by_text(
  query_embedding VECTOR(1536),
  limit_param INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content_id UUID,
  content_type TEXT,
  text_content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content_id,
    e.content_type, 
    e.text_content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM
    content_embeddings e
  ORDER BY
    similarity DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to check if vector extension is enabled
CREATE OR REPLACE FUNCTION public.check_vector_extension() 
RETURNS boolean AS $$
DECLARE
  extension_enabled boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) INTO extension_enabled;
  RETURN extension_enabled;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for content_embeddings
CREATE POLICY "Allow read access to content embeddings" 
  ON public.content_embeddings FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow insert to content embeddings" 
  ON public.content_embeddings FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create policies for user_preferences
CREATE POLICY "Allow users to read their own preferences" 
  ON public.user_preferences FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own preferences" 
  ON public.user_preferences FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own preferences" 
  ON public.user_preferences FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);
