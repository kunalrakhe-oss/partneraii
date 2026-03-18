
CREATE TABLE public.diet_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'My Diet Plan',
  plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  goal TEXT DEFAULT 'maintain',
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own diet plans" ON public.diet_plans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own diet plans" ON public.diet_plans
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diet plans" ON public.diet_plans
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view couple diet plans" ON public.diet_plans
  FOR SELECT TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));
