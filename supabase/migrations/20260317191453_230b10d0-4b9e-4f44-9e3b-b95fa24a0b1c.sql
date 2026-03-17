
-- Store relationship details for personalized AI advice
CREATE TABLE public.relationship_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  anniversary_date DATE,
  relationship_status TEXT DEFAULT 'dating', -- dating, engaged, married, long-distance, etc.
  love_language TEXT, -- words, acts, gifts, time, touch
  partner_love_language TEXT,
  shared_interests TEXT[], -- array of interests
  relationship_goal TEXT, -- e.g. "communicate better", "more quality time", "reduce arguments"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.relationship_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relationship details"
ON public.relationship_details FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relationship details"
ON public.relationship_details FOR INSERT
WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can update own relationship details"
ON public.relationship_details FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_relationship_details_updated_at
BEFORE UPDATE ON public.relationship_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
