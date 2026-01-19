# 💓 Reparatur: Herzschlag-Signal & Online-Status

Wir erlauben jetzt ausdrücklich das Updaten der `last_seen`-Spalte für jeden Nutzer. Das löst das Problem, dass der Online-Status immer 0 anzeigt.

Link zum SQL-Editor: [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)

Führe diesen Code aus:

```sql
-- 1. Eine einfache, klare Regel für Updates erstellen
DROP POLICY IF EXISTS "Users can update own last_seen" ON public.user_management;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_management;

-- Erlaube Updates für den eigenen User (WICHTIG!)
CREATE POLICY "Users can update own profile"
ON public.user_management
FOR UPDATE
USING (auth.uid() = user_id);

-- 2. Erlaube auch Inserts (falls der User noch gar nicht da ist)
CREATE POLICY "Users can insert own profile"
ON public.user_management
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Trigger (Optional, aber gut): Auch beim "nur gucken" den Zeitstempel setzen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Test

Nachdem du "Run" geklickt hast, lade deine Chat-Seite neu. Jetzt sollte der Herzschlag durchkommen!
