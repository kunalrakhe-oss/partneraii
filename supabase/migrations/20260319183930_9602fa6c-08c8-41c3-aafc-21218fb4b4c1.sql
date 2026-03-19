CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  raw_name TEXT;
BEGIN
  raw_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULL
  );

  -- If the name looks like a random string (e.g. Apple relay prefix), discard it
  IF raw_name IS NOT NULL AND raw_name ~ '^[a-z0-9]{8,}$' THEN
    raw_name := NULL;
  END IF;

  -- Final fallback to email prefix only if name looks real
  IF raw_name IS NULL THEN
    raw_name := split_part(NEW.email, '@', 1);
    -- If email is a private relay, don't use it
    IF NEW.email LIKE '%privaterelay.appleid.com' THEN
      raw_name := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id,
    raw_name,
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$function$;