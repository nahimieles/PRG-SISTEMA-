
create table if not exists audit_logs (
    id uuid primary key default gen_random_uuid(),
    action_type text not null, 
    file_name text,
    file_path text,
    worker_id uuid, 
    worker_name text,
    company_name text,
    timestamp timestamptz default now(),
    metadata jsonb
);
alter table audit_logs enable row level security;
create policy "Enable read access for all users"
on audit_logs for select
using (true);
create policy "Enable insert access for all users"
on audit_logs for insert
with check (true);
create policy "Enable delete access for all users"
on audit_logs for delete
using (true);
create index if not exists audit_logs_timestamp_idx on audit_logs(timestamp desc);
create index if not exists audit_logs_worker_idx on audit_logs(worker_name);
