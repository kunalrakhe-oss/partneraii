-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;

-- Create a security definer function to get partner_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_partner_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id FROM profiles WHERE user_id = auth.uid()
$$;

-- Recreate policy using the function
CREATE POLICY "Users can view partner profile"
ON public.profiles
FOR SELECT
USING (id = public.get_my_partner_profile_id());