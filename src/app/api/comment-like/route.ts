import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ensureUuidFormat } from '@/lib/utils';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { commentId, userId, action } = await request.json();

    if (!commentId || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: "Missing required parameters" 
      }, { status: 400 });
    }

    // Format the user ID to ensure it's in UUID format
    const formattedUserId = await ensureUuidFormat(userId);
    
    console.log(`Processing ${action} for comment ${commentId} by user ${formattedUserId}`);

    // Check if the comment exists first
    const { data: commentExists, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !commentExists) {
      console.error("Comment not found:", commentError);
      return NextResponse.json({
        success: false,
        message: "Comment not found"
      }, { status: 404 });
    }

    // Ensure the comment_likes table exists
    try {
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
          
          -- Add RLS policies if not exists
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'comment_likes' AND policyname = 'Allow authenticated users to create comment likes'
            ) THEN
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
            END IF;
          END $$;
        `
      });
      console.log("Ensured comment_likes table exists");
    } catch (setupError) {
      console.error("Error setting up comment_likes table:", setupError);
      // Continue anyway - table might already exist
    }

    if (action === 'like') {
      // First check if the like already exists
      const { data: existingLike, error: checkError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('user_id', formattedUserId)
        .eq('comment_id', commentId)
        .maybeSingle();

      console.log("Existing like check:", existingLike, checkError);

      if (existingLike) {
        return NextResponse.json({
          success: true,
          message: "Comment already liked",
          action: 'none',
          liked: true
        });
      }

      // Insert the like
      const { data, error } = await supabase
        .from('comment_likes')
        .insert({
          user_id: formattedUserId,
          comment_id: commentId,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error("Like error:", error);
        return NextResponse.json({
          success: false,
          message: "Failed to like comment",
          error
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Comment liked successfully",
        data,
        action: 'liked',
        liked: true
      });
    } else if (action === 'unlike') {
      const { data, error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('user_id', formattedUserId)
        .eq('comment_id', commentId)
        .select();

      if (error) {
        console.error("Unlike error:", error);
        return NextResponse.json({
          success: false,
          message: "Failed to unlike comment",
          error
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Comment unliked successfully",
        data,
        action: 'unliked',
        liked: false
      });
    }

    return NextResponse.json({
      success: false,
      message: "Invalid action"
    }, { status: 400 });

  } catch (error) {
    console.error("Error in comment-like API route:", error);
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred",
      error
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the comment ID and user ID from the query parameters
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const userId = searchParams.get('userId');

    if (!commentId || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: "Missing required parameters" 
      }, { status: 400 });
    }

    // Format the user ID to ensure it's in UUID format
    const formattedUserId = await ensureUuidFormat(userId);
    
    // Check if the user has liked the comment
    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('user_id', formattedUserId)
      .eq('comment_id', commentId)
      .maybeSingle();

    if (error) {
      console.error("Error checking like status:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to check like status",
        error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      liked: !!data,
      data
    });
  } catch (error) {
    console.error("Error in comment-like GET API route:", error);
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred",
      error
    }, { status: 500 });
  }
} 