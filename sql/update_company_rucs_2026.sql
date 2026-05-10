-- Actualización masiva de RUCs basada en la lista oficial proporcionada
-- Este script utiliza normalización de nombres para asegurar que coincidan a pesar de diferencias de formato.

DO $$
BEGIN
    -- PRG AUDITORES (Caso especial con dos RUCs posibles, priorizamos el principal)
    UPDATE public.companies SET ruc = '0917776312001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'PRGAUDITORESCLTDA' AND ruc IS NULL;
    
    -- Resto de empresas
    UPDATE public.companies SET ruc = '0992178310001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'BEDESCHI' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0990955611001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'HUANPROCA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993385218001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'MEDICOVER' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992727713001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'REYTRANSPORTSA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '1391933223001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'IMAGENORL' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0905995528001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'LEONORGARCIA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0891722028001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'CONSORCIOSCHAFFRYVELASQUEZ' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993076724001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ENDOVASCULAR' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '1314342831001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ALANISMIELES' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0928610237001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'NICOLERODRIGUEZ' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0908979537001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ALEXSCHAFFRY' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0104350939001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'VERONICAPRISCILAVINTIMILLAPADILLA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0101058238001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ELSAORELLANAOCHOA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0956715536001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ARIELZELAYA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993326739001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'CLIZEGA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992711841001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'PLASTICOSYPERFILES' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0190353249001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'DISMEDIC' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '1391932356001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'EQUIMEDI' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992745150001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'VISTAMARINA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0915307755001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'EDUARDOGOMEZ' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993194352001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'SUMIDEC' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992632852001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'BALOSCHI' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992172053001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'COSTAMARINA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993326259001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'DARZE' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0915368864001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ENRIQUEPALMA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993378168001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'EPALMANSAS' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0917045064001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'MEIBORHERRERA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993374361001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ARIZE' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993372777001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ERPALMAGSAS' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0930476478001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ALICIAMARTILLO' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992389575001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'FELSAMER' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993279676001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'GLOBALPLASTIC' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992676876001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'MIVISA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0925782682001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'LIGIAVARGAS' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992748885001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'COSTAELITE' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0104369087001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'JOHNPAULGONZALEZ' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993366880001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'SOLDIAMED' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '1793203386001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'CONSTRUCONVEXASAS' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992841281001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'AUBELONSASA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0926500398001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ISABELSCHAFFRY' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993379992001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'SECURITYBREACH' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0992736194001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'CONSTRUCTORAGRUPOBILD' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993361097001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'CAVALEX' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0993277002001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'PLASSEINPLASTICINDUSTRYSA' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0802094508001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'LUISCORTEZ' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '0956715502001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'ANDREACABRAL' AND ruc IS NULL;
    UPDATE public.companies SET ruc = '1311488108001' WHERE regexp_replace(upper(coalesce(name,'')),'[^A-Z0-9]','', 'g') = 'JANETHARACELYALAVAESMERALDAS' AND ruc IS NULL;

END $$;
