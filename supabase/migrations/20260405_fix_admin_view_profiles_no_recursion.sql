-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a SECURITY DEFINER function that checks the caller's role
-- without being subject to RLS (runs as DB owner, bypasses row-level policies).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('hq_admin', 'super_admin')
  );
$$;

-- Recreate the policy using the helper — no recursion possible
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (public.is_admin());
