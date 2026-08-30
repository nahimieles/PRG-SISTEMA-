
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'username') then
        alter table companies add column username text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'password') then
        alter table companies add column password text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'avatar_url') then
        alter table companies add column avatar_url text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'logo_url') then
        alter table companies add column logo_url text;
    end if;
end $$;
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'username') then
        alter table company_groups add column username text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'password') then
        alter table company_groups add column password text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'category') then
        alter table company_groups add column category text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'image_url') then
        alter table company_groups add column image_url text;
    end if;
end $$;
