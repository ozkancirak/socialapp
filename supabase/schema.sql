-- Main schema file for social app

-- Create Users Table with UUID primary key and clerk_id reference
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL, -- Clerk ID as reference
  username TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Posts Table with simple structure
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Likes Table
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Comment Likes Table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- Function to format clerk IDs (remove 'user_' prefix if present)
CREATE OR REPLACE FUNCTION format_clerk_id() RETURNS TRIGGER AS $$
BEGIN
  -- Remove user_ prefix if present
  IF NEW.clerk_id LIKE 'user_%' THEN
    NEW.clerk_id := substring(NEW.clerk_id from 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER format_clerk_id_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION format_clerk_id();

-- Create index on clerk_id for faster lookups
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON public.users (clerk_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Set RLS Policies - Simple approach for demo
-- Anyone can read users and posts
CREATE POLICY "Public users are viewable by everyone" 
  ON public.users FOR SELECT 
  USING (true);

CREATE POLICY "Public posts are viewable by everyone"
  ON public.posts FOR SELECT 
  USING (true);

CREATE POLICY "Public likes are viewable by everyone" 
  ON public.likes FOR SELECT 
  USING (true);

CREATE POLICY "Public comments are viewable by everyone" 
  ON public.comments FOR SELECT 
  USING (true);
  
CREATE POLICY "Public comment likes are viewable by everyone" 
  ON public.comment_likes FOR SELECT 
  USING (true);

-- Anyone can insert users and posts (for demo purposes)
CREATE POLICY "Anyone can insert users"
  ON public.users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can insert posts"
  ON public.posts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can insert likes"
  ON public.likes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete their likes"
  ON public.likes FOR DELETE
  TO anon, authenticated
  USING (true); -- Simplified for demo

CREATE POLICY "Anyone can insert comments"
  ON public.comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
  
CREATE POLICY "Anyone can insert comment likes"
  ON public.comment_likes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete their comment likes"
  ON public.comment_likes FOR DELETE
  TO anon, authenticated
  USING (true); -- Simplified for demo

-- Helper function to convert Clerk IDs to UUIDs
CREATE OR REPLACE FUNCTION clerk_id_to_uuid(clerk_id text) RETURNS uuid AS $$
DECLARE
  normalized_id text;
  result uuid;
BEGIN
  -- Check if it's already a valid UUID
  BEGIN
    result := clerk_id::uuid;
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    -- For development, use a more simplified approach
    RETURN '00000000-0000-4000-a000-000000000000'::uuid;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 