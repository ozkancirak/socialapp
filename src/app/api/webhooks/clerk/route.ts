import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase client initialization (use service role for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use Service Role Key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  console.log("Clerk Webhook received...");

  // Get the necessary headers
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return new Response('Error occured: Server configuration missing', {
      status: 500,
    });
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Webhook headers missing');
    return new Response('Error occured: Missing webhook headers', {
      status: 400,
    });
  }

  // Get the body
  let payload: WebhookEvent;
  try {
    const body = await req.json();
    payload = body as WebhookEvent;
  } catch (err) {
    console.error('Error parsing webhook body:', err);
    return new Response('Error occured: Invalid request body', { status: 400 });
  }


  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(JSON.stringify(payload), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    console.log("Webhook verified successfully. Event type:", evt.type);
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured: Webhook verification failed', {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Processing event type: ${eventType}`);

  // Handle the user.created event
  if (eventType === 'user.created') {
    const { id: clerk_id, email_addresses, first_name, last_name, image_url, username } = evt.data;

    const email = email_addresses?.[0]?.email_address; // Get primary email

    // Prepare data for Supabase insert
    const userData = {
      clerk_id: clerk_id, // Store the full Clerk ID
      email: email, // Store email if available
      username: username || `user_${clerk_id.substring(0, 8)}`, // Use Clerk username or generate one
      full_name: `${first_name || ''} ${last_name || ''}`.trim() || null, // Combine names or null
      avatar_url: image_url || null, // Store avatar URL or null
      // id column will be generated by Supabase default
    };

    console.log("Attempting to insert new user into Supabase:", userData);

    try {
      const { error } = await supabaseAdmin
        .from('users')
        .insert(userData)
        .select('id') // Select something to confirm insert
        .single(); // Expect single row or error

      if (error) {
         // Check if it's a duplicate clerk_id error
         if (error.code === '23505' && error.details?.includes('clerk_id')) {
            console.warn(`User with clerk_id ${clerk_id} already exists.`);
            // Treat as success if user already exists
         } else {
            console.error('Supabase insert error:', error);
            // Return an error response to Clerk to potentially retry
            return new Response('Error occured: Failed to create user in database', { status: 500 });
         }
      } else {
        console.log(`User ${clerk_id} created successfully in Supabase.`);
      }
    } catch (err) {
      console.error('Unexpected error during Supabase insert:', err);
      return new Response('Error occured: Unexpected database error', { status: 500 });
    }
  }

  // TODO: Handle user.updated and user.deleted events
  if (eventType === 'user.updated') {
      console.log("User updated event received:", evt.data.id);
      // Implement logic to update the user in Supabase
  }

  if (eventType === 'user.deleted') {
      console.log("User deleted event received:", evt.data.id);
      // Implement logic to potentially delete or deactivate the user in Supabase
      // Note: Need to handle case where id might be null for deleted event
      const clerkIdToDelete = evt.data.id;
      if (clerkIdToDelete) {
        // Example: Delete user
         try {
            const { error } = await supabaseAdmin
               .from('users')
               .delete()
               .eq('clerk_id', clerkIdToDelete);
            if (error) {
               console.error('Error deleting user from Supabase:', error);
               // Decide if this should be a 500 error back to Clerk
            } else {
               console.log(`User ${clerkIdToDelete} deleted from Supabase.`);
            }
         } catch(err) {
            console.error('Unexpected error deleting user:', err);
         }
      }
  }

  console.log('Webhook processed successfully.');
  return new Response('', { status: 200 }); // Send a 200 OK response to Clerk
} 