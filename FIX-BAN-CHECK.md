# Fix Ban Check Permissions

If banning isn't working on the frontend (you can still swipe), it's likely because the app can't read your ban status from the database due to missing permissions.

**Run this SQL in Supabase:**

```sql
-- Enable RLS on user_management if not already on
alter table public.user_management enable row level security;

-- Drop existing read policy if any (to be safe)
drop policy if exists "Users can read own data" on public.user_management;

-- Create policy to allow users to read their OWN data (including ban status)
create policy "Users can read own data"
on public.user_management
for select
to authenticated
using (
  auth.uid() = user_id
);

-- OPTIONAL: Allow service role (server) full access (usually default, but good to ensure)
-- This is often implicit, but explicit policies help avoid confusion.
```
