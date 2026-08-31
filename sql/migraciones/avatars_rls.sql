INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public select on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on avatars" ON storage.objects;

CREATE POLICY "Allow public select on avatars" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "Allow public insert on avatars" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow public update on avatars" ON storage.objects
FOR UPDATE TO public USING (bucket_id = 'avatars');

CREATE POLICY "Allow public delete on avatars" ON storage.objects
FOR DELETE TO public USING (bucket_id = 'avatars');
