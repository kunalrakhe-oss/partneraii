
-- Function to accept a partner invite and link both profiles
CREATE OR REPLACE FUNCTION public.accept_partner_invite(code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_row partner_invites%ROWTYPE;
  inviter_profile_id UUID;
  accepter_profile_id UUID;
BEGIN
  -- Find valid invite
  SELECT * INTO invite_row
  FROM partner_invites
  WHERE invite_code = code
    AND accepted_by IS NULL
    AND expires_at > now();

  IF invite_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

  -- Can't pair with yourself
  IF invite_row.inviter_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot use your own invite code');
  END IF;

  -- Get profile IDs
  SELECT id INTO inviter_profile_id FROM profiles WHERE user_id = invite_row.inviter_id;
  SELECT id INTO accepter_profile_id FROM profiles WHERE user_id = auth.uid();

  IF inviter_profile_id IS NULL OR accepter_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Mark invite as accepted
  UPDATE partner_invites
  SET accepted_by = auth.uid(), accepted_at = now()
  WHERE id = invite_row.id;

  -- Link both profiles
  UPDATE profiles SET partner_id = accepter_profile_id WHERE id = inviter_profile_id;
  UPDATE profiles SET partner_id = inviter_profile_id WHERE id = accepter_profile_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
