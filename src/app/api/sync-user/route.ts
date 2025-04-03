import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

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
    // First, check if we can connect to Supabase
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
        
      if (tableError) {
        console.error("Failed to query users table:", tableError);
        return NextResponse.json({
          success: false,
          message: "Failed to connect to Supabase",
          error: tableError
        }, { status: 500 });
      }
      
      console.log("Successfully connected to Supabase");
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json({
        success: false,
        message: "Database connection failed",
        error: dbError
      }, { status: 500 });
    }
  
    console.log("Trying to get current user from Clerk");
    // Get the current user from Clerk
    try {
      const authObject = getAuth(request);
      const userId = authObject.userId;
      
      if (!userId) {
        console.log("No user authenticated");
        return NextResponse.json({ 
          success: false, 
          message: "Not authenticated" 
        }, { status: 401 });
      }
      
      console.log("User ID from Clerk:", userId);
      
      // Get full user profile from Clerk
      try {
        console.log("Fetching user profile from Clerk API");
        const clerk = await clerkClient();
        const userProfile = await clerk.users.getUser(userId);
        
        console.log("Clerk API response:", JSON.stringify(userProfile, null, 2).substring(0, 200) + "...");
        
        if (!userProfile) {
          console.error("Could not get user profile from Clerk - response was null");
          return NextResponse.json({
            success: false,
            message: "Could not get user profile from Clerk"
          }, { status: 500 });
        }
        
        // Clerk ID'sini olduğu gibi kullan, prefix'i kaldırma
        const clerkId = userId;
        console.log("Clerk ID:", clerkId);
        
        // Build user data with proper name information
        let fullName = '';
        let displayName = '';
        let email = '';
        let avatarUrl = null;
        
        try {
          // Kullanıcının isim ve soyismini Clerk'ten alalım
          fullName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim();
          
          // Kullanıcı adı önceliği: 
          // 1. Tam adı (firstName + lastName)
          // 2. Clerk kullanıcı adı (username)
          // 3. Clerk ID (user_id)
          // Bu sırayla kontrol edip ilk null olmayanı kullanalım
          displayName = fullName || userProfile.username || userId;
          
          if (userProfile.emailAddresses && userProfile.emailAddresses.length > 0) {
            email = userProfile.emailAddresses[0].emailAddress || '';
          }
          
          avatarUrl = userProfile.imageUrl || null;
          
          console.log("User data extracted successfully:");
          console.log("  fullName:", fullName);
          console.log("  displayName:", displayName);
          console.log("  email:", email);
          console.log("  avatarUrl:", avatarUrl);
        } catch (dataError) {
          console.error("Error extracting user data from Clerk profile:", dataError);
          console.log("Using fallback values");
          displayName = userId; // Fallback olarak User ID kullan
        }
        
        // IMPORTANT: Check the actual structure of the users table
        try {
          const { data: tableStructure, error: descError } = await supabase
            .rpc('describe_table', { table_name: 'users' })
            .select('*');
            
          if (descError) {
            console.error("Error getting table structure:", descError);
          } else {
            console.log("Table structure columns:", tableStructure ? tableStructure.map((col: any) => col.column_name).join(', ') : 'No columns found');
          }
        } catch (structError) {
          console.error("Error checking table structure:", structError);
        }
        
        // Create or update user with proper name
        try {
          console.log("Checking if user already exists in Supabase");
          // First check if user already exists
          const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('id, username')
            .eq('clerk_id', clerkId)
            .maybeSingle();
          
          if (findError) {
            console.error("Error checking for existing user:", findError);
            if (findError.code !== 'PGRST116') {
              throw findError;
            }
          }
          
          if (existingUser) {
            // User exists, update them
            console.log("Updating existing user:", existingUser.id, "Current username:", existingUser.username);
            
            try {
              const { data: updateData, error: updateError } = await supabase
                .from('users')
                .update({
                  username: displayName,
                  full_name: fullName,
                  email: email,
                  avatar_url: avatarUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('clerk_id', clerkId)
                .select();
                
              if (updateError) {
                console.error("User update failed:", updateError);
                return NextResponse.json({
                  success: false,
                  message: "Failed to update user",
                  error: updateError
                }, { status: 500 });
              }
              
              console.log("User updated successfully:", updateData);
              return NextResponse.json({
                success: true,
                message: "User updated in Supabase",
                data: updateData
              });
            } catch (updateCatchError) {
              console.error("Exception during user update:", updateCatchError);
              return NextResponse.json({
                success: false,
                message: "Exception during user update",
                error: typeof updateCatchError === 'object' ? JSON.stringify(updateCatchError) : String(updateCatchError)
              }, { status: 500 });
            }
          }
          
          console.log("No existing user found, creating new user");
          // No existing user, create a new one
          try {
            // Try with all fields first
            const userData = {
              clerk_id: clerkId,
              username: displayName,
              full_name: fullName,
              email: email,
              avatar_url: avatarUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            console.log("Attempting to insert user with data:", userData);
            
            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .insert([userData])
              .select();
              
            if (insertError) {
              console.error("Insert failed:", insertError);
              
              if (insertError.message?.includes("id")) {
                console.log("ID field error detected, trying without ID");
                // Try without ID field
                const simplifiedUserData = {
                  clerk_id: clerkId,
                  username: displayName,
                  full_name: fullName,
                  email: email,
                  avatar_url: avatarUrl,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                console.log("Attempting simplified insert:", simplifiedUserData);
                
                const { data: altData, error: altError } = await supabase
                  .from('users')
                  .insert([simplifiedUserData])
                  .select();
                  
                if (altError) {
                  console.error("Alternative insert failed:", altError);
                  throw altError;
                } else {
                  console.log("Alternative insert succeeded:", altData);
                  return NextResponse.json({
                    success: true,
                    message: "User created with auto-generated ID",
                    data: altData
                  });
                }
              } else {
                throw insertError;
              }
            } else {
              console.log("Insert succeeded:", insertData);
              return NextResponse.json({
                success: true,
                message: "User synced to Supabase with clerk_id",
                data: insertData
              });
            }
          } catch (createError) {
            console.error("Error creating user:", createError);
            return NextResponse.json({
              success: false,
              message: "Error creating user in database",
              error: typeof createError === 'object' ? JSON.stringify(createError) : String(createError)
            }, { status: 500 });
          }
        } catch (userSyncError) {
          console.error("Error syncing user with database:", userSyncError);
          return NextResponse.json({
            success: false,
            message: "Error syncing user with database",
            error: typeof userSyncError === 'object' ? JSON.stringify(userSyncError) : String(userSyncError)
          }, { status: 500 });
        }
      } catch (clerkApiError) {
        console.error("Error fetching user from Clerk API:", clerkApiError);
        return NextResponse.json({
          success: false,
          message: "Error fetching user from Clerk API",
          error: typeof clerkApiError === 'object' ? JSON.stringify(clerkApiError) : String(clerkApiError)
        }, { status: 500 });
      }
    } catch (authError) {
      console.error("Error getting auth object:", authError);
      return NextResponse.json({
        success: false,
        message: "Error getting auth object",
        error: typeof authError === 'object' ? JSON.stringify(authError) : String(authError)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Unhandled error during user sync:", error);
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