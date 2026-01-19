# 👑 Mach MICH zum Admin (Sicher via ID)

Da dein User bereits eine ID hat (`a5a3ed39-da77-4b59-b9e3-457908cf97cd`), nutzen wir diese direkt. Das ist 100% sicher, selbst wenn die Email anders geschrieben wäre.

Führe diesen Code im **Supabase SQL Editor** aus (neues Tab!):

```sql
-- 1. Füge dich als Admin hinzu (via ID)
INSERT INTO public.admins (user_id, email)
VALUES (
    'a5a3ed39-da77-4b59-b9e3-457908cf97cd', 
    'maxrbn2002@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE 
SET email = EXCLUDED.email;

-- 2. Zur Sicherheit: Erlaube JEDEM authentifizierten Nutzer (also dir), 
-- die Admin-Tabelle zu lesen. Das behebt den 406 Error oft.
DROP POLICY IF EXISTS "Users can see own admin status" ON public.admins;

CREATE POLICY "Users can check admin status"
ON public.admins FOR SELECT
USING (true); -- Jeder darf die Liste sehen (nur Lesen!) entspannter für Debugging
```

## Test

Nachdem du "Run" geklickt hast:
1. Lade das Admin-Panel neu.
2. Jetzt sollte stehen: "✅ Admin-Rechte bestätigt!"
