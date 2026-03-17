ALTER TABLE public.grocery_items ADD COLUMN notes TEXT;
ALTER TABLE public.grocery_items ADD COLUMN due_date DATE;
ALTER TABLE public.grocery_items ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.grocery_items ADD COLUMN priority TEXT NOT NULL DEFAULT 'none';