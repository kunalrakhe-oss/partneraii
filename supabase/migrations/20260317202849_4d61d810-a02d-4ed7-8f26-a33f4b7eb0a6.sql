
-- Add new columns for the diet plan feature
ALTER TABLE public.diet_logs 
  ADD COLUMN IF NOT EXISTS assigned_to text NOT NULL DEFAULT 'me',
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;
