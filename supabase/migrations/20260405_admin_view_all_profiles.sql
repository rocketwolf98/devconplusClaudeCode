-- Allow hq_admin and super_admin to SELECT all profiles.
-- The subquery uses the existing "Users can view own profile" policy to read
-- the caller's own row — no recursion issue.
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('hq_admin', 'super_admin')
    )
  );
