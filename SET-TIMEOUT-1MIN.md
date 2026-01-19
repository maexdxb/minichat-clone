# ⚡ Turbo-Update: Online-Status (nur 1 Minute)

Wir verkürzen das Zeitfenster auf **1 Minute**. Wer sich 60 Sekunden nicht meldet, gilt als offline.

Führe diesen SQL-Code im **Supabase SQL Editor** aus:

```sql
-- Funktion zum Zählen der Online-Nutzer (nur letzte 1 Minute aktiv!)
CREATE OR REPLACE FUNCTION get_active_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM user_management
        WHERE last_seen > (NOW() - INTERVAL '1 minute')
    );
END;
$$;
```

## Test

Klicke auf Run. Die Startseite zeigt jetzt nur noch Nutzer an, die in der letzten Minute aktiv waren.
