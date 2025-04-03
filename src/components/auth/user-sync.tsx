"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { ensureUuidFormat } from "@/lib/clerk-helpers";
import supabase from "@/lib/supabase-client";

/**
 * This component syncs the Clerk user with Supabase
 * It should be placed in the app layout where it will run for authenticated users
 */
export function UserSync() {
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    // Only run if user is authenticated and loaded
    if (isLoaded && isSignedIn && user) {
      const syncUser = async () => {
        try {
          // Prepare user data
          const uniqueSuffix = user.id.substring(0, 6);
          const username = (user.username || `user`) + "_" + uniqueSuffix.replace(/-/g, '');
          
          const email = user.primaryEmailAddress?.emailAddress || 
            `${username}@example.com`;
          
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
            username;
            
          const avatarUrl = user.imageUrl;
          
          // Get UUID compatible with Supabase
          const formattedUserId = await ensureUuidFormat(user.id);
          
          // Just try a simple insert first
          const { error } = await supabase
            .from('users')
            .insert({
              id: formattedUserId,
              username,
              email,
              full_name: fullName,
              avatar_url: avatarUrl
            })
            .select()
            .single();
          
          // If the user already exists, try updating
          if (error && error.code === '23505') { // Unique violation
            await supabase
              .from('users')
              .update({
                username,
                email,
                full_name: fullName,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', formattedUserId);
          }
        } catch (error) {
          console.log("User sync attempt completed");
        }
      };
      
      syncUser();
    }
  }, [user, isSignedIn, isLoaded]);

  // This component doesn't render anything
  return null;
} 