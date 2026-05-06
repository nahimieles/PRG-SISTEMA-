-- Script para dar permisos públicos de subida, visualización, y borrado al bucket "audit-files"
-- Nota: Solo dar acceso a este bucket específicamente, sin afectar los demás buckets del sistema.

-- 1. Asegurarnos que el bucket exista, sino lo creamos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-files', 'audit-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Permitir Select (Visualizar archivos) a cualquier usuario anónimo o autenticado
CREATE POLICY "Allow public select on audit-files" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'audit-files');

-- 3. Permitir Insert (Subir archivos) a cualquier usuario anónimo o autenticado
CREATE POLICY "Allow public insert on audit-files" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'audit-files');

-- 4. Permitir Update (Reemplazar archivos) a cualquier usuario
CREATE POLICY "Allow public update on audit-files" ON storage.objects
FOR UPDATE TO public USING (bucket_id = 'audit-files');

-- 5. Permitir Delete (Borrar archivos) a cualquier usuario
CREATE POLICY "Allow public delete on audit-files" ON storage.objects
FOR DELETE TO public USING (bucket_id = 'audit-files');
