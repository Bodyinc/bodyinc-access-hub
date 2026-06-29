
CREATE POLICY "Anyone can view medicine images"
ON storage.objects FOR SELECT
USING (bucket_id = 'medicine-images');

CREATE POLICY "Admins can upload medicine images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medicine-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update medicine images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'medicine-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete medicine images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medicine-images' AND public.has_role(auth.uid(), 'admin'));
