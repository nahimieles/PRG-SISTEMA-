
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'username') then
        alter table company_groups add column username text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'password') then
        alter table company_groups add column password text;
    end if;
end $$;
