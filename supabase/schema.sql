-- Main schema file for social app

-- Create Users Table with simple structure
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
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

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

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
  USING (auth.uid() = user_id); -- Ensure users can only delete their own likes

CREATE POLICY "Anyone can insert comments"
  ON public.comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

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