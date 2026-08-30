alter table company_groups 
add column if not exists image_url text;
alter table company_groups 
add column if not exists description text;
