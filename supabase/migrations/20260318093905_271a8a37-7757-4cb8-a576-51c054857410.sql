
CREATE TABLE public.location_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_pair TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '2 hours')
);

ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own location" ON public.location_shares
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own location" ON public.location_shares
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own location" ON public.location_shares
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view couple locations" ON public.location_shares
  FOR SELECT TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.location_shares;
