
-- Create memory_reactions table for emoji reactions and comments on memories
CREATE TABLE public.memory_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'reaction', -- 'reaction' or 'comment'
  emoji TEXT, -- for reactions
  comment TEXT, -- for comments
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memory_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view couple reactions"
ON public.memory_reactions FOR SELECT
USING (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can add reactions"
ON public.memory_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can delete own reactions"
ON public.memory_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_reactions;
