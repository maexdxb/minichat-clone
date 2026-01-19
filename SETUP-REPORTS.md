# 🚨 Setup: Meldesystem & Screenshots

Wir benötigen eine Tabelle für die Reports und einen "Storage Bucket" (Dateispeicher), um die Screenshots hochzuladen.

## A. Supabase Storage (Bilder-Speicher) einrichten

1. Gehe in Supabase im Menü links auf **Storage** (Ordner-Symbol).
2. Klicke auf **"New Bucket"**.
3. Name: `reports` (Kleingeschrieben!)
4. Stelle den Bucket auf **Public** (öffentlich).
5. Klicke auf "Save".

## B. Datenbank & Rechte (SQL)

Führe diesen Code im **SQL Editor** aus:

```sql
-- 1. Tabelle für Meldungen erstellen
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES auth.users(id), -- Wer meldet?
    reported_user_id UUID REFERENCES auth.users(id), -- Wer wurde gemeldet? (Kann NULL sein bei Gästen)
    screenshot_url TEXT, -- Link zum Beweisfoto
    reason TEXT DEFAULT 'Missbrauch',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sicherheit (RLS) aktivieren
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. Policies (Regeln)

-- JEDER (auch Gäste) darf einen Report erstellen
CREATE POLICY "Anyone can create report"
ON public.reports FOR INSERT
WITH CHECK (true);

-- NUR Admins dürfen Reports sehen
CREATE POLICY "Admins can view reports"
ON public.reports FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()) OR
    auth.uid() IN (SELECT user_id FROM public.admins)
);

-- NUR Admins dürfen Status ändern (z.B. auf "banned" setzen)
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()) OR
    auth.uid() IN (SELECT user_id FROM public.admins)
);

-- 4. Storage Policies (Damit Bilder hochgeladen werden dürfen)
-- (Führe das aus, auch wenn du den Bucket schon erstellt hast)

-- Jeder darf Screenshots in den 'reports' Bucket hochladen
CREATE POLICY "Anyone can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'reports' );

-- Jeder darf Screenshots sehen (für Admin Panel)
CREATE POLICY "Anyone can view screenshots"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reports' );
```

## Fertig!
Wenn "Success" kommt und der Bucket erstellt ist, können wir den Code einbauen.
