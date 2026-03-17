
-- Fix get_partner_pair to return a value for solo users (user_id as their own partner_pair)
CREATE OR REPLACE FUNCTION public.get_partner_pair(uid uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p.partner_id IS NULL THEN 'solo:' || p.user_id::text
    WHEN p.user_id::text < p2.user_id::text THEN p.user_id::text || ':' || p2.user_id::text
    ELSE p2.user_id::text || ':' || p.user_id::text
  END
  FROM profiles p
  LEFT JOIN profiles p2 ON p2.id = p.partner_id
  WHERE p.user_id = uid
$function$;
