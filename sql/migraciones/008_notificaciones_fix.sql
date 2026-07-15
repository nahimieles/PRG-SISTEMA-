-- Migración para arreglar las notificaciones y soportar notificaciones globales o de administradores
ALTER TABLE notificaciones ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admin_users(id);
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;
