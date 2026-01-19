# 🟢 Update: Online-Status & Admin Fix

Führe diesen SQL-Code im **Supabase SQL Editor** aus. Er macht zwei Dinge:
1. Er fügt eine "Zuletzt gesehen" Spalte hinzu, damit wir sehen, wer online ist.
2. Er trägt **DICH** als Admin ein (damit die Liste nicht leer ist).

## SQL Code

1. Kopiere den Code.
2. Ersetze ganz unten `'deine-email@gmail.com'` mit deiner **echten Email-Adresse**, mit der du dich einloggst!

```sql
-- 1. Spalte für Online-Status hinzufügen
ALTER TABLE public.user_management 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Alle existierenden Nutzer in die user_management Tabelle importieren (falls sie fehlen)
INSERT INTO public.user_management (user_id, email, display_name, last_seen)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), created_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 3. DICH als Admin setzen
-- ACHTUNG: Ersetze unten die Email mit DEINER Email!
INSERT INTO public.admins (user_id, email)
SELECT id, email FROM auth.users 
WHERE email = 'maxrbn2002@gmail.com' -- <--- HIER DEINE EMAIL EINTRAGEN !!!
ON CONFLICT (user_id) DO NOTHING;

-- 4. Berechtigungen sicherstellen update
GRANT ALL ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
```

## Überprüfung
Nachdem du auf "Run" geklickt hast, führe diesen kleinen Code aus, um zu prüfen, ob du Admin bist:
```sql
SELECT * FROM admins;
```
Wenn dort deine Email steht -> Perfekt! 🎉
