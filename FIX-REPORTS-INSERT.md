# Fix Reports Insert

If reports are trying to send but simply vanishing, it's almost certainly the database rejecting them due to permissions (Row Level Security).

**Run this SQL in Supabase to DISABLE database checks temporarily:**

```sql
-- Disable RLS on reports table to allow ALL inserts/reads without policy checks
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;

-- If you prefer not to disable it completely, insure this policy exists:
create policy "Allow all actions for public"
on public.reports
for all
to public
using (true)
with check (true);
```

**Recommendation:** Run the first command `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;`. This is the surest way to make it work immediately. You can re-enable it later when you have time to debug permissions.
