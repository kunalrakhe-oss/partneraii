
CREATE TABLE public.chore_linked_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chore_id UUID NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
  grocery_item_id UUID NOT NULL REFERENCES public.grocery_items(id) ON DELETE CASCADE,
  partner_pair TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chore_id, grocery_item_id)
);

ALTER TABLE public.chore_linked_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple linked items" ON public.chore_linked_items
  FOR SELECT TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can insert linked items" ON public.chore_linked_items
  FOR INSERT TO authenticated
  WITH CHECK (partner_pair = get_partner_pair(auth.uid()));

CREATE POLICY "Users can delete linked items" ON public.chore_linked_items
  FOR DELETE TO authenticated
  USING (partner_pair = get_partner_pair(auth.uid()));
