-- ==========================================
-- TABLA PARA GESTIÓN DE WEBHOOKS (NOTIFICACIONES EN TIEMPO REAL)
-- ==========================================

-- Esta tabla permite que el sistema sepa qué drives ya están suscritos
-- y cuándo vencen las suscripciones para renovarlas automáticamente.

CREATE TABLE IF NOT EXISTS graph_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id TEXT UNIQUE NOT NULL,
    subscription_id TEXT NOT NULL,
    expiration_date_time TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE graph_subscriptions ENABLE ROW LEVEL SECURITY;

-- Permitir que el rol de servicio realice cualquier operación
CREATE POLICY "Service role can manage subscriptions" 
ON graph_subscriptions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Comentario informativo
COMMENT ON TABLE graph_subscriptions IS 'Almacena las suscripciones de Microsoft Graph para notificaciones push de cambios en SharePoint.';
