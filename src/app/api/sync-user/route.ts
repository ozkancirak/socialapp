import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createDeterministicUuid } from '@/lib/clerk-helpers';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Clerk
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: "Not authenticated" 
      }, { status: 401 });
    }
    
    // Format the clerk ID for DB storage (remove 'user_' prefix)
    const formattedClerkId = userId.startsWith('user_') ? userId.substring(5) : userId;
    
    // First, check if the user already exists in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', formattedClerkId)
      .maybeSingle();
      
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "User already exists in Supabase",
        userId: existingUser.id
      });
    }
    
    // Create a deterministic UUID from the Clerk ID
    const supabaseUuid = createDeterministicUuid(userId);
    
    // Create the user in Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          id: supabaseUuid,
          clerk_id: formattedClerkId,
          username: `user_${Math.floor(Math.random() * 10000)}`, // Temporary username
          created_at: new Date().toISOString()
        }
      ])
      .select();
      
    if (error) {
      console.error("Error creating user:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to create user in Supabase",
        error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "User successfully synced to Supabase",
      data
    });
    
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred",
      error
    }, { status: 500 });
  }
} 