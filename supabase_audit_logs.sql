-- Create Audit Logs Table for File Watcher System
create table if not exists audit_logs (
    id uuid primary key default gen_random_uuid(),
    action_type text not null, -- 'UPLOAD', 'EDIT', 'DELETE', 'CREATE_FOLDER', 'MOVE', 'RENAME'
    file_name text,
    file_path text,
    worker_id uuid, -- Can be null if system action or external
    worker_name text,
    company_name text,
    timestamp timestamptz default now(),
    metadata jsonb
);

-- Enable RLS
alter table audit_logs enable row level security;

-- Policies
create policy "Enable read access for all users"
on audit_logs for select
using (true);

create policy "Enable insert access for all users"
on audit_logs for insert
with check (true);

-- Optional: Index for faster queries on reports
create index if not exists audit_logs_timestamp_idx on audit_logs(timestamp desc);
create index if not exists audit_logs_worker_idx on audit_logs(worker_name);
