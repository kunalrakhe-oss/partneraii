
-- Calendar Events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'date-night',
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_time TEXT,
  assigned_to TEXT NOT NULL DEFAULT 'both',
  priority TEXT NOT NULL DEFAULT 'medium',
  recurrence TEXT NOT NULL DEFAULT 'once',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple events" ON public.calendar_events FOR SELECT USING (partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can add events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can update couple events" ON public.calendar_events FOR UPDATE USING (partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can delete couple events" ON public.calendar_events FOR DELETE USING (partner_pair = get_partner_pair(auth.uid()));

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Chat Messages table (with realtime)
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple messages" ON public.chat_messages FOR SELECT USING (partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Mood Logs table
CREATE TABLE public.mood_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  mood TEXT NOT NULL,
  note TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple moods" ON public.mood_logs FOR SELECT USING (partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can log mood" ON public.mood_logs FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can update own mood" ON public.mood_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mood" ON public.mood_logs FOR DELETE USING (auth.uid() = user_id);
