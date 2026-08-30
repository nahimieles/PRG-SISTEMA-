
CREATE TABLE IF NOT EXISTS graph_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id TEXT UNIQUE NOT NULL,
    subscription_id TEXT NOT NULL,
    expiration_date_time TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE graph_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage subscriptions" 
ON graph_subscriptions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

COMMENT ON TABLE graph_subscriptions IS 'Almacena las suscripciones de Microsoft Graph para notificaciones push de cambios en SharePoint.';
