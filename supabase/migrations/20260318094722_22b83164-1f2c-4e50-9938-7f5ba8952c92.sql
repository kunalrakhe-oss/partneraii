
-- Health metrics table for manual daily tracking
CREATE TABLE public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_pair TEXT NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER DEFAULT NULL,
  heart_rate INTEGER DEFAULT NULL,
  sleep_hours DOUBLE PRECISION DEFAULT NULL,
  calories_burned INTEGER DEFAULT NULL,
  weight DOUBLE PRECISION DEFAULT NULL,
  water_glasses INTEGER DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One entry per user per day
CREATE UNIQUE INDEX health_metrics_user_date ON public.health_metrics (user_id, metric_date);

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own metrics" ON public.health_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own metrics" ON public.health_metrics
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view couple metrics" ON public.health_metrics
  FOR SELECT TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can delete own metrics" ON public.health_metrics
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
