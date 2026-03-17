
ALTER TABLE public.diet_logs 
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS recurrence_day integer;
