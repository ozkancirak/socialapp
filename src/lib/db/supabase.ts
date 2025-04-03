import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with higher privileges (use only in server context)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// The tables we'll be working with
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          email: string;
          avatar_url: string;
          bio: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string;
          email: string;
          avatar_url?: string;
          bio?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          full_name?: string;
          email?: string;
          avatar_url?: string;
          bio?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          image_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          image_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          image_url?: string;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
      };
      likes: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          updated_at?: string;
        };
      };
      // Add other tables as needed
    };
  };
}; 