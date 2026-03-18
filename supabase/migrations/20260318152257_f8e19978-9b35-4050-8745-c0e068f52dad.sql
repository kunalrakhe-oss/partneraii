
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-images', 'exercise-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read exercise images"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-images');

CREATE POLICY "Authenticated users can upload exercise images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-images');
