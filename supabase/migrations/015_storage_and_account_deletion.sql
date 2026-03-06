-- ── Storage: avatars bucket ────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ── Account deletion: remove all user data then auth user ─────────────────────

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.reward_redemptions  WHERE user_id   = auth.uid();
  DELETE FROM public.point_transactions  WHERE user_id   = auth.uid();
  DELETE FROM public.event_registrations WHERE user_id   = auth.uid();
  DELETE FROM public.news_posts          WHERE author_id = auth.uid();
  DELETE FROM public.profiles            WHERE id        = auth.uid();
  DELETE FROM auth.users                 WHERE id        = auth.uid();
END;
$$;
