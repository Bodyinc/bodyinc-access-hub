INSERT INTO storage.buckets (id, name, public)
VALUES ('medicine-images', 'medicine-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read medicine images"
  ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'medicine-images');

CREATE POLICY "Admins upload medicine images"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medicine-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update medicine images"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'medicine-images'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'medicine-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete medicine images"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medicine-images'
    AND public.has_role(auth.uid(), 'admin')
  );
