-- Ensure company_groups exists with correct schema
create table if not exists company_groups (
    id uuid primary key default gen_random_uuid(),
    parent_id uuid references company_groups(id) on delete cascade,
    name text not null,
    type text check (type in ('group', 'folder', 'link')) not null,
    icon text,
    color text,
    resource_id text,
    permissions jsonb default '["admin", "manager"]',
    order_index integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Ensure companies table has group_id linking to company_groups
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'group_id') then
        alter table companies add column group_id uuid references company_groups(id) on delete set null;
    end if;
end $$;

-- Enable RLS on company_groups if not already enabled
alter table company_groups enable row level security;

-- Add policies safely
do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'company_groups' and policyname = 'Enable read access for all users') then
        create policy "Enable read access for all users" on company_groups for select using (true);
    end if;

    if not exists (select 1 from pg_policies where tablename = 'company_groups' and policyname = 'Enable all access for all users') then
        create policy "Enable all access for all users" on company_groups for all using (true) with check (true);
    end if;
end $$;

-- Add avatar_url column to companies table for company logos/profile photos
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'avatar_url') then
        alter table companies add column avatar_url text;
    end if;
end $$;
