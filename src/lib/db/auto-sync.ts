import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';
import { createDeterministicUuid } from '../clerk-helpers';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Automatically syncs the current user to Supabase if they don't exist
 * To be called on critical pages or during app initialization
 */
export async function autoSyncCurrentUser() {
  try {
    // Get current user ID from Clerk
    const { userId } = auth();
    
    if (!userId) {
      console.log("No user signed in, skipping auto-sync");
      return null;
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
      console.log("User already exists in Supabase, auto-sync skipped");
      return existingUser.id;
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
      console.error("Error during auto-sync:", error);
      return null;
    }
    
    console.log("User successfully auto-synced to Supabase");
    return data[0]?.id || null;
    
  } catch (error) {
    console.error("Unexpected error in autoSyncCurrentUser:", error);
    return null;
  }
} 