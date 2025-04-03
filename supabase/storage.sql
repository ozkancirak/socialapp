-- Helper functions for storage setup

-- Create a public storage bucket
CREATE OR REPLACE FUNCTION create_public_bucket(bucket_name text) RETURNS json AS $$
BEGIN
  -- Create the bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES (bucket_name, bucket_name, true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create policy for public access
  BEGIN
    EXECUTE format('
      CREATE POLICY "Allow public access to %I"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = %L)
    ', bucket_name, bucket_name);
  EXCEPTION WHEN OTHERS THEN
    -- Policy may already exist, which is fine
  END;
  
  -- Create policy for uploads
  BEGIN
    EXECUTE format('
      CREATE POLICY "Allow uploads to %I"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = %L)
    ', bucket_name, bucket_name);
  EXCEPTION WHEN OTHERS THEN
    -- Policy may already exist, which is fine
  END;
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 