# 🔓 Admin-Zugriff reparieren

Führe diesen SQL-Code im **Supabase SQL Editor** aus. Er erlaubt dem Admin-Panel, zu prüfen, ob du Rechte hast.

```sql
-- 1. RLS für Admins Tabelle sicherstellen
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 2. Alte Policies entfernen (um Fehler zu vermeiden)
DROP POLICY IF EXISTS "Users can see own admin status" ON public.admins;
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;

-- 3. NEUE Policy: Du darfst nachsehen, ob du selbst in der Liste stehst
CREATE POLICY "Users can see own admin status"
ON public.admins FOR SELECT
USING (auth.uid() = user_id);

-- 4. Berechtigungen sicherstellen
GRANT SELECT ON public.admins TO authenticated;
GRANT SELECT ON public.admins TO service_role;
```

## Testen

Nachdem du auf "Run" geklickt hast:
1. Gehe zurück zu deiner Admin-Seite (`.../admin.html`).
2. Lade die Seite neu.
3. Jetzt sollten die Nutzer geladen werden!
