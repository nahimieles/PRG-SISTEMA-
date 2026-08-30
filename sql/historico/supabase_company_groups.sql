
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
alter table company_groups enable row level security;
create policy "Enable read access for all users"
on company_groups for select
using (true);
create policy "Enable all access for all users"
on company_groups for all
using (true)
with check (true);
create index if not exists company_groups_parent_idx on company_groups(parent_id);
create index if not exists company_groups_order_idx on company_groups(order_index);
