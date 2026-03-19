
-- Add life_goals column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN life_goals TEXT[] NOT NULL DEFAULT '{}';
