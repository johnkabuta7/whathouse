DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "View listing images" ON storage.objects;

CREATE POLICY "Authenticated users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view listing images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'listings');