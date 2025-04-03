-- Comment Likes Table - Ensure it exists
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- Referans ekle
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,     -- Referans ekle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, comment_id) -- Tekrarlı beğenileri engelle
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies (Mevcutları silip yeniden oluştur, idempotency için)
DROP POLICY IF EXISTS "Allow read access to everyone" ON public.comment_likes;
CREATE POLICY "Allow read access to everyone"
  ON public.comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert likes" ON public.comment_likes;
CREATE POLICY "Allow authenticated users to insert likes"
  ON public.comment_likes FOR INSERT
  TO authenticated -- Sadece giriş yapmış kullanıcılar
  WITH CHECK (auth.uid() = user_id); -- Kullanıcı sadece kendi adına like atabilir

DROP POLICY IF EXISTS "Allow users to delete their own likes" ON public.comment_likes;
CREATE POLICY "Allow users to delete their own likes"
  ON public.comment_likes FOR DELETE
  TO authenticated -- Sadece giriş yapmış kullanıcılar
  USING (auth.uid() = user_id); -- Kullanıcı sadece kendi like'ını silebilir