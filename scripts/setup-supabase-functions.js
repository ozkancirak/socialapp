// script to setup Supabase functions
// This is for development purposes only

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key');
  process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupFunctions() {
  try {
    console.log('Setting up Supabase schema and functions...');
    
    // Order of SQL files matters
    const sqlFiles = [
      'setup.sql',   // Helper functions
      'schema.sql',  // Main schema and policies
      'storage.sql'  // Storage helpers
    ];
    
    for (const file of sqlFiles) {
      console.log(`Executing ${file}...`);
      
      // Read SQL file
      const sqlPath = path.join(__dirname, '..', 'supabase', file);
      
      // Check if file exists
      if (!fs.existsSync(sqlPath)) {
        console.log(`File ${file} does not exist. Skipping.`);
        continue;
      }
      
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Execute SQL
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
        
        if (error) {
          console.error(`Error executing ${file}:`, error);
          // Continue with other files
        } else {
          console.log(`${file} executed successfully`);
        }
      } catch (err) {
        console.error(`Failed to execute ${file}:`, err);
        // Continue with other files
      }
    }
    
    console.log('Setting up storage bucket...');
    try {
      // Create post-images bucket
      const { data, error } = await supabase.rpc('create_public_bucket', {
        bucket_name: 'post-images'
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('Storage bucket created or updated successfully');
      }
    } catch (err) {
      console.error('Failed to create storage bucket:', err);
    }
    
    console.log('Setup completed');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupFunctions(); 