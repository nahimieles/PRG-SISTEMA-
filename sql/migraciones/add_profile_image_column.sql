-- Agregar columna profile_image_url a admin_users si no existe
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
