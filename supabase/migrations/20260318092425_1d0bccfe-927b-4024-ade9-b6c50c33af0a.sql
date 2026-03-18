
CREATE TABLE public.period_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE,
  cycle_length INTEGER DEFAULT 28,
  period_duration INTEGER DEFAULT 5,
  symptoms TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.period_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple period logs"
  ON public.period_logs FOR SELECT
  TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can add period logs"
  ON public.period_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own period logs"
  ON public.period_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own period logs"
  ON public.period_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_period_logs_updated_at
  BEFORE UPDATE ON public.period_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
