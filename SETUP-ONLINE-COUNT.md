# 📊 Live-Zähler für Website & Admin

Wir erstellen eine Funktion, die die aktiven Nutzer zählt, und erlauben der Website, diese Zahl abzufragen.

Führe diesen Code im **Supabase SQL Editor** aus:

```sql
-- 1. Funktion zum Zählen der Online-Nutzer (letzte 15 Minuten aktiv)
CREATE OR REPLACE FUNCTION get_active_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM user_management
        WHERE last_seen > (NOW() - INTERVAL '15 minutes')
    );
END;
$$;

-- 2. Erlaube JEDEM (auch Gästen auf der Startseite), diese Zahl abzurufen
GRANT EXECUTE ON FUNCTION get_active_user_count TO anon;
GRANT EXECUTE ON FUNCTION get_active_user_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_user_count TO service_role;

-- 3. Sicherstellen, dass die last_seen Spalte korrekt geschrieben werden darf
CREATE POLICY "Users can update own last_seen"
ON public.user_management
FOR UPDATE
USING (auth.uid() = user_id);

-- (Falls permission denied errors auftreten, hilft dieser Reset der Policy oft)
```

## Test

Klicke auf Run. Wenn "Success" kommt, können wir den Code auf der Webseite anpassen!
