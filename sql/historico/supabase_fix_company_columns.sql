-- Ensure companies table has username and password columns
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'username') then
        alter table companies add column username text;
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'password') then
        alter table companies add column password text;
    end if;
    
    -- Also ensure avatar_url exists (some files use logo_url, we want to standardize)
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'avatar_url') then
        alter table companies add column avatar_url text;
    end if;
end $$;
