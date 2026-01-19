# 🛠️ Reparatur: Datenbank & Nutzer-Profile

Damit die Nutzer-Profile automatisch erstellt werden, müssen wir sicherstellen, dass die Datenbank "Schreibrechte" für die Nutzer hat (damit sie sich selbst eintragen können), falls der automatische Server-Trigger klemmt.

Führe den folgenden SQL-Code im **Supabase SQL Editor** aus, um das Problem zu beheben.

## 1. SQL Code ausführen

1. Gehe zu [Supabase Dashboard](https://supabase.com/dashboard).
2. Öffne dein Projekt.
3. Klicke links auf **SQL Editor**.
4. Klicke auf **New Query**.
5. Kopiere den gesamten Code unten und füge ihn ein.
6. Klicke auf **Run**.

```sql
-- 1. Tabelle sicherstellen (falls noch nicht da)
CREATE TABLE IF NOT EXISTS public.user_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'temp_banned', 'perm_banned')),
    ban_reason TEXT,
    ban_until TIMESTAMP WITH TIME ZONE,
    banned_at TIMESTAMP WITH TIME ZONE,
    banned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. RLS (Sicherheit) aktivieren
ALTER TABLE public.user_management ENABLE ROW LEVEL SECURITY;

-- 3. Bestehende Policies löschen (um Konflikte zu vermeiden)
DROP POLICY IF EXISTS "Users can view own status" ON public.user_management;
DROP POLICY IF EXISTS "Users can update own status" ON public.user_management;
DROP POLICY IF EXISTS "Users can insert own status" ON public.user_management;
DROP POLICY IF EXISTS "Admins can view all users" ON public.user_management;
DROP POLICY IF EXISTS "Admins can update users" ON public.user_management;

-- 4. NEUE Policies erstellen (WICHTIG!)

-- Admins dürfen ALLES sehen und bearbeiten
CREATE POLICY "Admins can do everything"
ON public.user_management
FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()) OR
    auth.uid() IN (SELECT user_id FROM public.admins)
);

-- Nutzer dürfen ihren EIGENEN Eintrag sehen
CREATE POLICY "Users can view own profile"
ON public.user_management FOR SELECT
USING (auth.uid() = user_id);

-- Nutzer dürfen ihren EIGENEN Eintrag erstellen (WICHTIG für Sync!)
CREATE POLICY "Users can insert own profile"
ON public.user_management FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Nutzer dürfen ihren EIGENEN Eintrag aktualisieren (z.B. Name ändern)
CREATE POLICY "Users can update own profile"
ON public.user_management FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Trigger sicherstellen (Automatisch beim Login)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_management (user_id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger löschen und neu setzen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Grant Permissions (vorsichtshalber)
GRANT ALL ON public.user_management TO authenticated;
GRANT ALL ON public.user_management TO service_role;
```

## 2. Testen

1. Nachdem du den Code ausgeführt hast (`Success` Meldung), lade deine Minichat-Seite neu.
2. Melde dich einmal ab und wieder an (oder lade einfach die Seite neu, das Skript prüft auch beim Laden).
3. Öffne das **Admin Panel** (`/admin.html`).
4. Jetzt solltest du dich selbst und alle anderen Nutzer sehen, die sich **ab jetzt** einloggen (oder die Seite neu laden).

### Hinweis zu "0 Nutzern":
Nutzer, die sich früher angemeldet haben, erscheinen erst in der Liste, wenn sie sich **einmal neu einloggen** oder die Seite besuchen (durch das Update in `auth.js`).

Sag Bescheid, wenn es geklappt hat! 🚀
