-- Create Company Groups Table for Virtual Directory System
create table if not exists company_groups (
    id uuid primary key default gen_random_uuid(),
    parent_id uuid references company_groups(id) on delete cascade, -- Self-referencing for nesting
    name text not null,
    type text check (type in ('group', 'folder', 'link')) not null,
    icon text, -- Lucide icon name
    color text, -- Hex color code
    resource_id text, -- SharePoint DriveID, SiteID, or FolderID
    permissions jsonb default '["admin", "manager"]', -- Roles allowed
    order_index integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table company_groups enable row level security;

-- Policies

-- Allow read access to everyone (so users can see the dashboard)
create policy "Enable read access for all users"
on company_groups for select
using (true);

-- Allow all access for now (we will restrict this to admins later in the app logic or updated policies)
-- Ideally this should be: using (auth.uid() in (select user_id from admins)) or similar
create policy "Enable all access for all users"
on company_groups for all
using (true)
with check (true);

-- Indexes for performance
create index if not exists company_groups_parent_idx on company_groups(parent_id);
create index if not exists company_groups_order_idx on company_groups(order_index);
