-- Create a function to remove a partner connection
CREATE OR REPLACE FUNCTION public.remove_partner(partner_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_profile_id UUID;
BEGIN
  SELECT id INTO my_profile_id FROM profiles WHERE user_id = auth.uid();
  
  IF my_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Verify they are actually partners
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = my_profile_id AND partner_id = partner_profile_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not connected to this partner');
  END IF;

  -- Unlink both profiles
  UPDATE profiles SET partner_id = NULL WHERE id = my_profile_id;
  UPDATE profiles SET partner_id = NULL WHERE id = partner_profile_id;

  RETURN jsonb_build_object('success', true);
END;
$$;