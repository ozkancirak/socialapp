"use server";

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Setup the database tables and policies
 */
export async function setupDatabase() {
  try {
    console.log("Setting up database...");
    
    // Create comments table
    await supabase.rpc('exec_sql', {
      sql: `
        -- Comments Table
        CREATE TABLE IF NOT EXISTS comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Add RLS policies
        ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
        
        -- Allow anonymous reads for comments
        CREATE POLICY "Allow anonymous read access to comments" ON comments
        FOR SELECT USING (true);
        
        -- Allow authenticated users to create comments
        CREATE POLICY "Allow authenticated users to create comments" ON comments
        FOR INSERT TO authenticated USING (true) WITH CHECK (true);
        
        -- Allow users to update their own comments
        CREATE POLICY "Allow users to update their own comments" ON comments
        FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        
        -- Allow users to delete their own comments
        CREATE POLICY "Allow users to delete their own comments" ON comments
        FOR DELETE TO authenticated USING (auth.uid() = user_id);
        
        -- Create an index for faster lookups by post_id
        CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
        
        -- Create an index for faster lookups by user_id
        CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
        
        -- Create trigger to update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_comments_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER update_comments_updated_at
        BEFORE UPDATE ON comments
        FOR EACH ROW
        EXECUTE FUNCTION update_comments_updated_at_column();
      `
    });
    
    console.log("Comments table created successfully");
    
    // Create comment_likes table
    await supabase.rpc('exec_sql', {
      sql: `
        -- Comment Likes Table
        CREATE TABLE IF NOT EXISTS comment_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          
          -- Ensure a user can only like a comment once
          UNIQUE(user_id, comment_id)
        );
        
        -- Add RLS policies
        ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
        
        -- Allow authenticated users to create comment likes
        CREATE POLICY "Allow authenticated users to create comment likes" ON comment_likes
        FOR INSERT TO authenticated USING (true) WITH CHECK (true);
        
        -- Allow authenticated users to delete their own comment likes
        CREATE POLICY "Allow authenticated users to delete their own comment likes" ON comment_likes
        FOR DELETE TO authenticated USING (auth.uid() = user_id);
        
        -- Allow anyone to read comment likes
        CREATE POLICY "Allow anyone to read comment likes" ON comment_likes
        FOR SELECT USING (true);
        
        -- Create indexes for faster lookup
        CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);
        CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON comment_likes(user_id);
      `
    });
    
    console.log("Comment likes table created successfully");
    
    return { success: true };
  } catch (error) {
    console.error("Error setting up database:", error);
    return { success: false, error };
  }
} 