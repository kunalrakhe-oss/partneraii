
-- Add reminder and countdown columns to calendar_events
ALTER TABLE public.calendar_events
ADD COLUMN reminder text DEFAULT 'none',
ADD COLUMN countdown_type text DEFAULT 'none';
