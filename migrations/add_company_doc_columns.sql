-- Add document URL columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS financieros_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS impuestos_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS informes_url TEXT;
