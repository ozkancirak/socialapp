"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

/**
 * This component syncs the Clerk user with Supabase
 * It should be placed in the app layout where it will run for authenticated users
 */
export function UserSync() {
  const { isSignedIn, user, isLoaded } = useUser();

  useEffect(() => {
    // Wait for Clerk to load and user to be signed in
    if (!isLoaded || !isSignedIn || !user) return;

    // Helper function to run sync when component mounts
    const syncUser = async () => {
      try {
        // Call the API endpoint instead of direct library function
        const response = await fetch("/api/sync-user");
        const data = await response.json();
        
        if (data.success) {
          console.log("User sync successful");
        } else {
          console.error("Failed to sync user to database:", data.message);
        }
      } catch (error) {
        console.error("Error during user sync:", error);
      }
    };

    // Run the sync operation
    syncUser();
  }, [isLoaded, isSignedIn, user]);

  // This is a background component, it doesn't render anything
  return null;
} 