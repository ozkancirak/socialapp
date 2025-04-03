-- Function to execute SQL statements
-- CAUTION: This is for development/setup only and should not be used in production
DROP FUNCTION IF EXISTS exec_sql(text);

CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  select_result JSONB;
  is_select BOOLEAN;
BEGIN
  -- Check if it's a SELECT query
  is_select := position('SELECT' in upper(sql)) = 1;
  
  IF is_select THEN
    -- For SELECT queries
    BEGIN
      -- Try to execute and capture results
      EXECUTE sql INTO select_result;
      RETURN select_result;
    EXCEPTION WHEN others THEN
      -- If the normal approach fails, try the more direct jsonb_agg approach
      BEGIN
        EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql || ') t' INTO result;
        RETURN result;
      EXCEPTION WHEN others THEN
        -- Log the error and return information about the error
        RAISE NOTICE 'Error executing SELECT query: %', SQLERRM;
        RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE, 'query', sql);
      END;
    END;
  ELSE
    -- For non-SELECT queries, return affected rows
    EXECUTE sql;
    GET DIAGNOSTICS result = ROW_COUNT;
    RETURN jsonb_build_object('affected_rows', result);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for easier comment likes queries
CREATE OR REPLACE VIEW comment_likes_with_count AS
SELECT 
  c.id as comment_id,
  COUNT(cl.id) as likes_count,
  json_agg(cl.user_id) as liked_by_users
FROM 
  comments c
LEFT JOIN 
  comment_likes cl ON c.id = cl.comment_id
GROUP BY 
  c.id;

-- Function to get comment likes for a specific user
CREATE OR REPLACE FUNCTION get_user_comment_likes(p_user_id UUID) 
RETURNS TABLE(comment_id UUID, is_liked BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    CASE WHEN cl.id IS NOT NULL THEN TRUE ELSE FALSE END
  FROM 
    comments c
  LEFT JOIN 
    comment_likes cl ON c.id = cl.comment_id AND cl.user_id = p_user_id;
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