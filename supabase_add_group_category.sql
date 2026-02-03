-- Add category column to company_groups if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'category') then
        alter table company_groups add column category text;
    end if;
end $$;

-- Update existing groups if needed (optional, just for organization)
-- UPDATE company_groups SET category = 'contabilidad' WHERE name ILIKE '%conta%';
