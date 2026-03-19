
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Service role insert policy for edge functions inserting via service key
-- (the send-push function reads subscriptions using service role)

-- Update notify_partner_mood to also send web push via pg_net
CREATE OR REPLACE FUNCTION public.notify_partner_mood()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  partner_user_id UUID;
  mood_label TEXT;
  sender_name TEXT;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  SELECT p2.user_id INTO partner_user_id
  FROM profiles p
  JOIN profiles p2 ON p2.id = p.partner_id
  WHERE p.user_id = NEW.user_id;

  IF partner_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, 'Your partner') INTO sender_name
  FROM profiles WHERE user_id = NEW.user_id;

  mood_label := CASE NEW.mood
    WHEN 'happy' THEN 'Happy 😊'
    WHEN 'tired' THEN 'Tired 😵‍💫'
    WHEN 'sad' THEN 'Sad 😢'
    WHEN 'angry' THEN 'Stressed 😫'
    WHEN 'neutral' THEN 'Loved 🥰'
    ELSE NEW.mood
  END;

  INSERT INTO notifications (user_id, partner_pair, type, title, message, link)
  VALUES (
    partner_user_id,
    NEW.partner_pair,
    'mood',
    sender_name || ' is feeling ' || mood_label,
    COALESCE(NEW.note, 'Check in on them ❤️'),
    '/mood'
  );

  -- Send web push notification via edge function
  BEGIN
    SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
    SELECT current_setting('app.settings.service_role_key', true) INTO service_key;
    IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/send-push',
        body := json_build_object(
          'user_id', partner_user_id,
          'title', sender_name || ' is feeling ' || mood_label,
          'body', COALESCE(NEW.note, 'Check in on them ❤️'),
          'url', '/mood'
        )::jsonb,
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        )::jsonb
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the trigger if push fails
    NULL;
  END;

  RETURN NEW;
END;
$function$;

-- Update notify_partner_chat to also send web push
CREATE OR REPLACE FUNCTION public.notify_partner_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  partner_user_id UUID;
  sender_name TEXT;
  msg_preview TEXT;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  SELECT p2.user_id INTO partner_user_id
  FROM profiles p
  JOIN profiles p2 ON p2.id = p.partner_id
  WHERE p.user_id = NEW.user_id;

  IF partner_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, 'Your partner') INTO sender_name
  FROM profiles WHERE user_id = NEW.user_id;

  msg_preview := CASE WHEN NEW.type = 'image' THEN '📷 Sent a photo' ELSE LEFT(NEW.message, 80) END;

  INSERT INTO notifications (user_id, partner_pair, type, title, message, link)
  VALUES (
    partner_user_id,
    NEW.partner_pair,
    'chat',
    sender_name || ' sent a message',
    msg_preview,
    '/chat'
  );

  -- Send web push notification via edge function
  BEGIN
    SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
    SELECT current_setting('app.settings.service_role_key', true) INTO service_key;
    IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/send-push',
        body := json_build_object(
          'user_id', partner_user_id,
          'title', sender_name || ' sent a message',
          'body', msg_preview,
          'url', '/chat'
        )::jsonb,
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        )::jsonb
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;
