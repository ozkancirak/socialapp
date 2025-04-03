-- Function to execute SQL statements
-- CAUTION: This is for development/setup only and should not be used in production
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql;
  result := json_build_object('success', true);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create a post (bypassing RLS for development)
CREATE OR REPLACE FUNCTION create_post(
  p_user_id UUID,
  p_content TEXT,
  p_image_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_post_id UUID;
BEGIN
  INSERT INTO posts (user_id, content, image_url, created_at)
  VALUES (p_user_id, p_content, p_image_url, NOW())
  RETURNING id INTO v_post_id;
  
  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 