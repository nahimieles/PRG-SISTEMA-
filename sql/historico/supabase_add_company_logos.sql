-- Add logo_url to companies table if it doesn't exist
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update existing companies with a null logo initially
-- UPDATE companies SET logo_url = NULL WHERE logo_url IS NULL;
