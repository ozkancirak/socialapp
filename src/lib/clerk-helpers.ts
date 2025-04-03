import supabase from "./supabase-client";
import { toast } from "sonner"; // Import toast for error messages

/**
 * Fetches the Supabase UUID corresponding to a Clerk User ID.
 * Assumes the `users` table has a `clerk_id` column storing the Clerk ID.
 */
export async function ensureUuidFormat(clerkId: string): Promise<string | null> { 
  // Always check for null/undefined input
  if (!clerkId) {
    console.error("ensureUuidFormat called with invalid clerkId:", clerkId);
    toast.error("User ID is missing.");
    return null; 
  }

  // Clerk IDs often have a prefix like 'user_'
  const cleanClerkId = clerkId.startsWith('user_') ? clerkId.substring(5) : clerkId;

  console.log(`Querying Supabase user UUID for Clerk ID: ${cleanClerkId}`);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id') // Select the Supabase UUID
      .eq('clerk_id', cleanClerkId) // Filter by the Clerk ID
      .single(); // Expect only one user or null

    if (error) {
      // Handle case where user is not found (data will be null, error might indicate reason)
      if (error.code === 'PGRST116') { // PostgREST code for "Fetched 0 rows"
        console.warn(`User with Clerk ID ${cleanClerkId} not found in Supabase users table.`);
        toast.error("User profile not found in database. Please ensure syncing is complete.");
      } else {
        // Log other unexpected errors
        console.error("Error fetching user UUID from Supabase:", error);
        toast.error("Database error fetching user profile.");
      }
      return null; // Return null on error or if not found
    }

    if (data && data.id) {
      console.log(`Found Supabase UUID: ${data.id} for Clerk ID: ${cleanClerkId}`);
      return data.id; // Return the Supabase UUID
    } else {
      // Should be covered by error handling above, but as a safeguard:
      console.warn(`User with Clerk ID ${cleanClerkId} not found, but no specific error code.`);
      toast.error("User profile not found in database.");
      return null;
    }

  } catch (err) {
    console.error("Unexpected error in ensureUuidFormat:", err);
    toast.error("An unexpected error occurred while verifying user.");
    return null;
  }
}

/**
 * Creates a deterministic UUID from any string input
 */
export function createDeterministicUuid(id: string): string {
  // First, remove the user_ prefix if present
  const cleanId = id.startsWith('user_') ? id.substring(5) : id;
  
  // Remove all non-alphanumeric characters
  const alphanumericOnly = cleanId.replace(/[^a-zA-Z0-9]/g, '');
  
  // Ensure we have enough characters (at least 32)
  let normalizedId = alphanumericOnly;
  while (normalizedId.length < 32) {
    normalizedId += alphanumericOnly;
  }
  
  // Take first 32 characters if longer
  normalizedId = normalizedId.substring(0, 32);
  
  // Format as UUID
  return [
    normalizedId.substring(0, 8),
    normalizedId.substring(8, 12),
    // Ensure the 13th character is '4' for UUID v4 format
    '4' + normalizedId.substring(12, 16).substring(1),
    // Ensure the 17th character is '8' for UUID v4 variant 1
    '8' + normalizedId.substring(16, 20).substring(1),
    normalizedId.substring(20, 32)
  ].join('-');
} 