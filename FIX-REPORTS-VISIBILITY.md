# Fix Report Visibility

The reason reports are not showing up is likely a database permission issue. Even if you are an admin, the database "Policy" might be preventing the system from confirming your admin status during the report fetch.

**Run this SQL code in Supabase to fix it:**

```sql
-- 1. Ensure the 'admins' table is readable so the check works
alter table public.admins enable row level security;

create policy "Allow read access to admins table"
on public.admins
for select
to authenticated
using (true);

-- 2. Drop the old restrictive policy on reports if it exists
drop policy if exists "Enable read for admins" on public.reports;

-- 3. Create a robust policy for reading reports
create policy "Enable read for admins"
on public.reports
for select
to authenticated
using (
  exists (
    select 1 from public.admins
    where admins.user_id = auth.uid()
  )
);
```
