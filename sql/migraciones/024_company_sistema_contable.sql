-- 024_company_sistema_contable.sql
-- Adds sistema_contable_slug to companies table

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS sistema_contable_slug TEXT;

-- Refresh schema cache if needed
NOTIFY pgrst, 'reload schema';
