import { auth, currentUser } from '@clerk/nextjs';
import { supabase } from '../db/supabase';

export const getUserId = () => {
  const { userId } = auth();
  return userId;
};

export const getCurrentUser = async () => {
  const user = await currentUser();
  return user;
};

// Function to sync Clerk user data with Supabase
export const syncUserWithSupabase = async () => {
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    return null;
  }
  
  const userData = {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    username: clerkUser.username || `user_${clerkUser.id.substring(0, 8)}`,
    full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
    avatar_url: clerkUser.imageUrl || '',
    updated_at: new Date().toISOString(),
  };
  
  // Check if user exists in Supabase
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('id', clerkUser.id)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching user:', fetchError);
    return null;
  }
  
  if (!existingUser) {
    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    
    return data;
  } else {
    // Update existing user
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', clerkUser.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    
    return data;
  }
}; 