
-- Add reply_to column for threaded replies
ALTER TABLE public.chat_messages
ADD COLUMN reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Create message reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  partner_pair TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple reactions"
ON public.message_reactions FOR SELECT
USING (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id AND partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can remove own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
