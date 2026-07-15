alter table company_groups 
add column if not exists image_url text;

-- Also ensure we can store descriptions if not already
alter table company_groups 
add column if not exists description text;
