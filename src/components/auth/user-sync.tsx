"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { autoSyncCurrentUser } from "@/lib/db/auto-sync";
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
        const result = await autoSyncCurrentUser();
        
        if (result) {
          console.log("User sync successful");
        } else {
          // Only show toast on error to avoid disrupting normal usage
          console.error("Failed to sync user to database");
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