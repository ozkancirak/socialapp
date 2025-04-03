import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ensureUuidFormat } from '@/lib/clerk-helpers';

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

    // Note: We're assuming the comment_likes table already exists in the database.
    // It should be created through the Supabase SQL Editor instead of here.

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