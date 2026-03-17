-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications for any user in the pair
CREATE POLICY "Insert notifications for partner pair"
ON public.notifications FOR INSERT
WITH CHECK (partner_pair = get_partner_pair(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create a function to auto-create notifications when partner does something
CREATE OR REPLACE FUNCTION public.notify_partner_mood()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partner_user_id UUID;
  mood_label TEXT;
  sender_name TEXT;
BEGIN
  -- Find the partner's user_id
  SELECT p2.user_id INTO partner_user_id
  FROM profiles p
  JOIN profiles p2 ON p2.id = p.partner_id
  WHERE p.user_id = NEW.user_id;

  IF partner_user_id IS NULL THEN RETURN NEW; END IF;

  -- Get sender name
  SELECT COALESCE(display_name, 'Your partner') INTO sender_name
  FROM profiles WHERE user_id = NEW.user_id;

  -- Map mood to label
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_mood_log_notify
AFTER INSERT ON public.mood_logs
FOR EACH ROW
EXECUTE FUNCTION public.notify_partner_mood();

-- Create a function to notify on chat messages
CREATE OR REPLACE FUNCTION public.notify_partner_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partner_user_id UUID;
  sender_name TEXT;
  msg_preview TEXT;
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_msg_notify
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_partner_chat();