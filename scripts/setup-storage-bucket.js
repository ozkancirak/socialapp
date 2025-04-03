// Script to setup Supabase storage bucket
// This is for development purposes only

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key');
  process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBucket() {
  try {
    console.log('Setting up storage bucket...');
    
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      throw bucketsError;
    }
    
    // Check if our bucket exists
    const bucketName = 'post-images';
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`);
      
      // Create the bucket
      const { error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
      
      console.log('Bucket created successfully');
    } else {
      console.log(`Bucket ${bucketName} already exists`);
      
      // Update bucket to ensure it's public
      const { error: updateError } = await supabase
        .storage
        .updateBucket(bucketName, {
          public: true
        });
      
      if (updateError) {
        console.error('Error updating bucket:', updateError);
        throw updateError;
      }
      
      console.log('Bucket updated to be public');
    }
    
    console.log('Storage setup complete');
  } catch (error) {
    console.error('Storage setup failed:', error);
    process.exit(1);
  }
}

setupStorageBucket(); 