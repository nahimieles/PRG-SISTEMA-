-- ============================================================
-- file_baseline table
-- Stores the last known state of every monitored file so the
-- server-side delta scanner can detect CREATE / MODIFY / RENAME / MOVED.
-- ============================================================

create table if not exists file_baseline (
    file_id                 text        primary key,
    drive_id                text        not null,
    name                    text,
    last_modified_date_time text,
    etag                    text,
    ctag                    text,
    parent_path             text,
    parent_id               text,
    updated_at              timestamptz default now()
);

-- Index for quick lookups per drive
create index if not exists idx_file_baseline_drive_id on file_baseline (drive_id);

-- RLS: allow service-role only (server-side writes via anon key in dev)
alter table file_baseline enable row level security;

-- Allow full access from service role / anon (adjust to service_role in production)
create policy "Allow all for authenticated" on file_baseline
    for all
    using (true)
    with check (true);
