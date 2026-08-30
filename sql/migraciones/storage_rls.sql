
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-files', 'audit-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Allow public select on audit-files" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'audit-files');

CREATE POLICY "Allow public insert on audit-files" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'audit-files');

CREATE POLICY "Allow public update on audit-files" ON storage.objects
FOR UPDATE TO public USING (bucket_id = 'audit-files');

CREATE POLICY "Allow public delete on audit-files" ON storage.objects
FOR DELETE TO public USING (bucket_id = 'audit-files');
