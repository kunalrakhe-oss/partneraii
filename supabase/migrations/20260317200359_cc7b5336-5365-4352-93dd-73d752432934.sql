
-- Create workouts table
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple workouts" ON public.workouts FOR SELECT USING (partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can add workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Create diet_logs table
CREATE TABLE public.diet_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'lunch',
  description TEXT NOT NULL,
  calories INTEGER,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple diet logs" ON public.diet_logs FOR SELECT USING (partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can add diet logs" ON public.diet_logs FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));
CREATE POLICY "Users can update own diet logs" ON public.diet_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diet logs" ON public.diet_logs FOR DELETE USING (auth.uid() = user_id);
