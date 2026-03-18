
-- Recovery Plans table
CREATE TABLE public.recovery_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'physio',
  title TEXT NOT NULL DEFAULT 'Recovery Plan',
  assessment_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_phase INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own plans" ON public.recovery_plans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can view couple plans" ON public.recovery_plans
  FOR SELECT TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own plans" ON public.recovery_plans
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans" ON public.recovery_plans
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Recovery Progress table
CREATE TABLE public.recovery_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  phase_index INTEGER NOT NULL DEFAULT 0,
  exercise_name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  pain_level INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own progress" ON public.recovery_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can view couple progress" ON public.recovery_progress
  FOR SELECT TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own progress" ON public.recovery_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON public.recovery_progress
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
