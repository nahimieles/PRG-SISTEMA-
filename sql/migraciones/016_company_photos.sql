
ALTER TABLE companies ADD COLUMN IF NOT EXISTS interior_photo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exterior_photo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb;
