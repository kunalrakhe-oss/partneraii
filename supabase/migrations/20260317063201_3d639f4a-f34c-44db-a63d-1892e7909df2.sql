
-- Add image_url column to chores
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url column to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url column to grocery_items
ALTER TABLE public.grocery_items ADD COLUMN IF NOT EXISTS image_url text;

-- Create attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
