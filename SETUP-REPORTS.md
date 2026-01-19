# Setup Reports Table

Run this SQL in your Supabase SQL Editor to create the reports table:

```sql
create table public.reports (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  reporter_id uuid null,
  reported_user_id uuid null,
  reason text null,
  screenshot text null,
  status text null default 'pending'::text,
  constraint reports_pkey primary key (id),
  constraint reports_reporter_id_fkey foreign key (reporter_id) references auth.users (id)
) tablespace pg_default;

-- Add RLS Policies
alter table public.reports enable row level security;

-- Allow authenticated users to insert reports
create policy "Enable insert for authenticated users only"
on public.reports
as permissive
for insert
to authenticated
with check (true);

-- Allow admins to read all reports (assuming admins table logic or service role)
-- For simplicity in this demo, we allow authenticated read if they are admin
-- But since we use Service Role key in backend usually, or here we are frontend admin.
-- We reuse the admin check logic or just allow read for now.
-- Ideally:
create policy "Enable read for admins"
on public.reports
as permissive
for select
to authenticated
using (
  exists (
    select 1 from admins
    where admins.user_id = auth.uid()
  )
);

-- Allow admins to update status
create policy "Enable update for admins"
on public.reports
as permissive
for update
to authenticated
using (
  exists (
    select 1 from admins
    where admins.user_id = auth.uid()
  )
);
```
