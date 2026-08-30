
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
create index if not exists idx_file_baseline_drive_id on file_baseline (drive_id);
alter table file_baseline enable row level security;
create policy "Allow all for authenticated" on file_baseline
    for all
    using (true)
    with check (true);
