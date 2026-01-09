-- Storage policies for artworks bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'artworks');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'artworks');

CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'artworks');

CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'artworks');
