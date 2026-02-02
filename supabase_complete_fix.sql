-- ==========================================
-- FINAL DATABASE FIX (COMPANIES & GROUPS)
-- ==========================================

-- 1. FIX COMPANIES TABLE
do $$
begin
    -- username column
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'username') then
        alter table companies add column username text;
    end if;
    
    -- password column
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'password') then
        alter table companies add column password text;
    end if;
    
    -- avatar_url column
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'avatar_url') then
        alter table companies add column avatar_url text;
    end if;

    -- logo_url column (for compatibility)
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'logo_url') then
        alter table companies add column logo_url text;
    end if;
end $$;

-- 2. FIX COMPANY_GROUPS TABLE
do $$
begin
    -- username column
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'username') then
        alter table company_groups add column username text;
    end if;
    
    -- password column
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'password') then
        alter table company_groups add column password text;
    end if;
    
    -- category column
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'category') then
        alter table company_groups add column category text;
    end if;

    -- image_url column
    if not exists (select 1 from information_schema.columns where table_name = 'company_groups' and column_name = 'image_url') then
        alter table company_groups add column image_url text;
    end if;
end $$;
