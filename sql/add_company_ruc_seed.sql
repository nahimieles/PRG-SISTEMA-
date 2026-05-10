-- Migration: add RUC to companies and seed known values from RUC EMPRESAS.xlsx
-- Run in Supabase SQL Editor after deploying the app changes.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ruc TEXT;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_ruc_format;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_ruc_format CHECK (ruc IS NULL OR ruc ~ '^[0-9]{13}$');

CREATE INDEX IF NOT EXISTS idx_companies_ruc ON public.companies(ruc);

-- Existing values are not overwritten. If a company already has a RUC, this leaves it untouched.
UPDATE public.companies SET ruc = '0917776312001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('PRG AUDITORES C. LTDA.'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992178310001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('BEDESCHI'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0990955611001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('HUANPROCA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993385218001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('MEDICOVER'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992727713001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('REYTRANSPORT S.A'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '1391933223001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('IMAGENORL'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0905995528001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('LEONOR GARCIA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0891722028001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('CONSORCIO SCHAFFRY-VELASQUEZ'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993076724001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ENDOVASCULAR'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '1314342831001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ALANIS MIELES'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0928610237001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('NICOLE RODRIGUEZ'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0908979537001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ALEX SCHAFFRY'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0104350939001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('VERONICA PRISCILA VINTIMILLA PADILLA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0101058238001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ELSA ORELLANA OCHOA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0956715536001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ARIEL ZELAYA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993326739001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('CLIZEGA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992711841001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('PLASTICOS Y PERFILES'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0190353249001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('DISMEDIC'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
-- Duplicate Excel name skipped for manual review: PRG AUDITORES C. LTDA. -> 0993270253001
UPDATE public.companies SET ruc = '1391932356001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('EQUIMEDI'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992745150001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('VISTAMARINA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0915307755001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('EDUARDO GOMEZ'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993194352001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('SUMIDEC'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992632852001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('BALOSCHI'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992172053001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('COSTAMARINA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993326259001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('DARZE'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0915368864001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ENRIQUE PALMA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993378168001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('EPALMAN S.A.S.'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0917045064001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('MEIBOR HERRERA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993374361001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ARIZE'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993372777001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ERPALMAG S.A.S'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0930476478001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ALICIA MARTILLO'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992389575001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('FELSAMER'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993279676001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('GLOBAL PLASTIC'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992676876001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('MIVISA'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0925782682001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('LIGIA VARGAS'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992748885001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('COSTAELITE'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0104369087001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('JOHN PAUL GONZALEZ'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993366880001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('SOLDIAMED'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '1793203386001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('CONSTRUCONVEXA S.A.S'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992841281001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('AUBELONSA S.A.'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0926500398001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ISABEL SCHAFFRY'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993379992001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('SECURITY BREACH'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0992736194001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('CONSTRUCTORA GRUPO BILD'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993361097001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('CAVALEX'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0993277002001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('PLASSEIN PLASTIC INDUSTRY S.A.'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0802094508001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('LUIS CORTEZ'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '0956715502001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('ANDREA CABRAL'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;
UPDATE public.companies SET ruc = '1311488108001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = regexp_replace(upper('JANETH ARACELY ALAVA ESMERALDAS'),'[^A-Z0-9]','', 'g') AND ruc IS NULL;

-- Optional check: companies still without RUC
SELECT id, name, type FROM public.companies WHERE ruc IS NULL ORDER BY name;
