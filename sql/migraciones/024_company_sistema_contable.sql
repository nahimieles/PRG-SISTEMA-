
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS sistema_contable_slug TEXT;
NOTIFY pgrst, 'reload schema';
