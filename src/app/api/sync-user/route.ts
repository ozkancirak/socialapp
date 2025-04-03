import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';

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
  console.log("Sync user API called");
  
  try {
    console.log("Trying to get current user from Clerk");
    // Get the current user from Clerk
    const user = await currentUser();
    console.log("Clerk currentUser response:", user ? "User found" : "No user");
    
    if (!user || !user.id) {
      console.log("No user authenticated");
      return NextResponse.json({ 
        success: false, 
        message: "Not authenticated" 
      }, { status: 401 });
    }
    
    const userId = user.id;
    console.log("User ID from Clerk:", userId);
    
    // Format the clerk ID for DB storage (remove 'user_' prefix if needed)
    const formattedClerkId = userId.startsWith('user_') ? userId.substring(5) : userId;
    console.log("Formatted Clerk ID:", formattedClerkId);
    
    console.log("Checking if user exists in Supabase");
    // First, check if the user already exists in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', formattedClerkId) // Look up by clerk_id
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
      console.log("User already exists in Supabase:", existingUser);
      return NextResponse.json({
        success: true,
        message: "User already exists in Supabase",
        userId: existingUser.id
      });
    }
    
    // Prepare username - use Clerk username or generate one
    const username = user.username || 
      `user_${Math.floor(Math.random() * 10000)}`;
    
    // Prepare full name
    const fullName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim() 
      : username;
    
    // Get avatar
    const avatarUrl = user.imageUrl;
    
    console.log(`Creating user with clerk_id ${formattedClerkId}, username: ${username}`);
    
    // Create the user in Supabase - id will be auto-generated
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          clerk_id: formattedClerkId, // Store clerk_id as reference
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
        console.log("Duplicate key error - trying to fetch existing user");
        // If it's a duplicate error, try to get the existing user
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', formattedClerkId)
            .single();
            
          if (existingUser) {
            console.log("Found existing user after conflict:", existingUser);
            return NextResponse.json({
              success: true,
              message: "Found existing user after conflict",
              userId: existingUser.id
            });
          }
        } catch (e) {
          console.error("Failed to fetch user after conflict:", e);
        }
        
        details = "User with this clerk_id already exists";
      } else if (error.code === '23502') { // Not null violation
        details = "Missing required field";
      }
      
      console.log("Returning error response:", details);
      return NextResponse.json({
        success: false,
        message: `Failed to create user in Supabase: ${details || error.message}`,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }, { status: 500 });
    }
    
    console.log("User successfully created:", data);
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