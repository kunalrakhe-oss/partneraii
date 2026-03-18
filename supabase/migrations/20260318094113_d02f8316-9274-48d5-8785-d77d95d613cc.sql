
CREATE TABLE public.budget_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_pair TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL DEFAULT 'other',
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence TEXT DEFAULT 'once',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own entries" ON public.budget_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own entries" ON public.budget_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON public.budget_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view couple entries" ON public.budget_entries
  FOR SELECT TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));
