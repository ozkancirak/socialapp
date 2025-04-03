import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { createDeterministicUuid } from '@/lib/clerk-helpers';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Safety checks for server-side environment variables
if (!supabaseUrl) {
  console.error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!supabaseServiceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Clerk
    const user = await currentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ 
        success: false, 
        message: "Not authenticated" 
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Format the clerk ID for DB storage (remove 'user_' prefix)
    const formattedClerkId = userId.startsWith('user_') ? userId.substring(5) : userId;
    
    // First, check if the user already exists in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', formattedClerkId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking for existing user:", checkError);
      return NextResponse.json({
        success: false,
        message: "Failed to check for existing user",
        error: checkError
      }, { status: 500 });
    }
      
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "User already exists in Supabase",
        userId: existingUser.id
      });
    }
    
    // Create a deterministic UUID from the Clerk ID
    const supabaseUuid = createDeterministicUuid(userId);
    
    // Prepare username - use Clerk username or generate one
    const username = user.username || 
      `user_${Math.floor(Math.random() * 10000)}`;
    
    // Prepare full name
    const fullName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim() 
      : username;
    
    // Get avatar
    const avatarUrl = user.imageUrl;
    
    console.log(`Creating user with ID ${supabaseUuid} and Clerk ID ${formattedClerkId}`);
    
    // Create the user in Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          id: supabaseUuid,
          clerk_id: formattedClerkId,
          username: username,
          full_name: fullName,
          avatar_url: avatarUrl,
          created_at: new Date().toISOString()
        }
      ])
      .select();
      
    if (error) {
      console.error("Error creating user:", error);
      
      // Check why the insert failed
      let details = '';
      
      if (error.code === '23505') { // Unique violation
        // If it's a duplicate error, try to get the existing user
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', formattedClerkId)
            .single();
            
          if (existingUser) {
            return NextResponse.json({
              success: true,
              message: "Found existing user after conflict",
              userId: existingUser.id
            });
          }
        } catch (e) {
          console.error("Failed to fetch user after conflict:", e);
        }
        
        details = "User with this ID or clerk_id already exists";
      } else if (error.code === '23502') { // Not null violation
        details = "Missing required field";
      }
      
      return NextResponse.json({
        success: false,
        message: `Failed to create user in Supabase: ${details || error.message}`,
        error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "User successfully synced to Supabase",
      data
    });
    
  } catch (error: any) {
    console.error("Error syncing user:", error);
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred", 
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: 500 });
  }
} 