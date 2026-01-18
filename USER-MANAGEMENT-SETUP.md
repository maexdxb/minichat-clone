# 🔐 Google Login & Nutzer-Verwaltung - Setup Anleitung

## Übersicht

Dieses System ermöglicht:
- ✅ Google OAuth Login (Pflicht für Nutzer)
- ✅ Nutzer temporär sperren (z.B. 24 Stunden)
- ✅ Nutzer permanent sperren
- ✅ Admin-Panel zur Verwaltung
- ✅ Automatische Entsperrung nach Ablauf

---

## 📋 SCHRITT 1: Google OAuth einrichten

### 1.1 Google Cloud Console

1. Gehe zu: https://console.cloud.google.com
2. **Neues Projekt erstellen:**
   - Klicke auf "Select a project" → "New Project"
   - Name: `Minichat`
   - Klicke "Create"

3. **OAuth Consent Screen:**
   - Gehe zu "APIs & Services" → "OAuth consent screen"
   - User Type: **External**
   - App name: `Siagechat`
   - User support email: Deine Email
   - Developer contact: Deine Email
   - Klicke "Save and Continue"
   - Scopes: Keine hinzufügen (Skip)
   - Test users: Füge deine Email hinzu
   - Klicke "Save and Continue"

4. **Credentials erstellen:**
   - Gehe zu "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: `Minichat Web Client`
   - Authorized redirect URIs:
     ```
     https://jpvvlmqcqxmreffjhfvm.supabase.co/auth/v1/callback
     ```
   - Klicke "Create"
   - **KOPIERE:** Client ID und Client Secret

### 1.2 Supabase konfigurieren

1. Gehe zu: https://supabase.com/dashboard
2. Wähle dein Projekt: `minichat`
3. **Authentication** → **Providers**
4. Finde **Google** und klicke "Enable"
5. Füge ein:
   - **Client ID:** (von Google Cloud Console)
   - **Client Secret:** (von Google Cloud Console)
6. **Save**

---

## 🗄️ SCHRITT 2: Datenbank einrichten

### 2.1 SQL ausführen

1. Gehe zu **Supabase** → **SQL Editor**
2. Klicke "New query"
3. Kopiere und führe aus:

```sql
-- Nutzer-Verwaltung Tabelle
CREATE TABLE user_management (
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

-- Indizes
CREATE INDEX idx_user_management_user_id ON user_management(user_id);
CREATE INDEX idx_user_management_status ON user_management(status);

-- Automatisch Nutzer hinzufügen
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_management (user_id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Admin-Tabelle
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

4. Klicke "Run"

### 2.2 Dich als Admin hinzufügen

```sql
-- Ersetze mit deiner echten Gmail-Adresse!
INSERT INTO admins (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'deine-email@gmail.com';
```

**WICHTIG:** Ersetze `deine-email@gmail.com` mit der Email, die du für Google Login verwendest!

---

## 🔒 SCHRITT 3: Guest-Modus deaktivieren (Optional)

Falls du **NUR** Google Login erlauben willst (kein Gast-Modus):

### In `config.js`:
```javascript
features: {
    guestMode: false,  // Deaktiviert!
    googleLogin: true
}
```

### In `index.html`:
Entferne den Gast-Button oder verstecke ihn:
```html
<!-- <button class="btn-guest">...</button> -->
```

---

## 👨‍💼 SCHRITT 4: Admin-Panel nutzen

### 4.1 Admin-Panel öffnen

URL: `https://minichat-clone.vercel.app/admin.html`

### 4.2 Funktionen

**Nutzer temporär sperren:**
1. Klicke "Temp" bei einem Nutzer
2. Wähle Dauer (Stunden)
3. Gib Grund ein
4. Klicke "Sperren"

**Nutzer permanent sperren:**
1. Klicke "Perm" bei einem Nutzer
2. Gib Grund ein
3. Klicke "Sperren"

**Nutzer entsperren:**
1. Klicke "Entsperren" bei einem gesperrten Nutzer

---

## 🧪 SCHRITT 5: Testen

### 5.1 Als normaler Nutzer

1. Öffne: `https://minichat-clone.vercel.app`
2. Klicke "Anmelden"
3. Melde dich mit Google an
4. Du solltest chatten können

### 5.2 Nutzer sperren

1. Öffne Admin-Panel
2. Sperre einen Test-Nutzer
3. Lass ihn versuchen, sich anzumelden
4. Er sollte eine Fehlermeldung sehen

### 5.3 Automatische Entsperrung

1. Sperre einen Nutzer für 1 Stunde
2. Warte 1 Stunde
3. Nutzer kann sich wieder anmelden

---

## 📊 Datenbank-Struktur

### `user_management` Tabelle

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| user_id | UUID | Referenz zu auth.users |
| email | TEXT | Email des Nutzers |
| display_name | TEXT | Anzeigename |
| status | TEXT | 'active', 'temp_banned', 'perm_banned' |
| ban_reason | TEXT | Grund für Sperre |
| ban_until | TIMESTAMP | Bis wann gesperrt (nur temp) |
| banned_at | TIMESTAMP | Wann gesperrt |
| banned_by | UUID | Welcher Admin hat gesperrt |

### `admins` Tabelle

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| user_id | UUID | Referenz zu auth.users |
| email | TEXT | Email des Admins |

---

## 🔐 Sicherheit

### Row Level Security (RLS)

Füge in Supabase → SQL Editor hinzu:

```sql
-- Enable RLS
ALTER TABLE user_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Admins können alles sehen
CREATE POLICY "Admins can view all users"
ON user_management FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM admins
        WHERE admins.user_id = auth.uid()
    )
);

-- Admins können Nutzer updaten
CREATE POLICY "Admins can update users"
ON user_management FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM admins
        WHERE admins.user_id = auth.uid()
    )
);

-- Nutzer können ihren eigenen Status sehen
CREATE POLICY "Users can view own status"
ON user_management FOR SELECT
USING (user_id = auth.uid());
```

---

## ⚙️ Erweiterte Funktionen

### Weitere Admins hinzufügen

```sql
INSERT INTO admins (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'neuer-admin@gmail.com';
```

### Alle gesperrten Nutzer anzeigen

```sql
SELECT email, status, ban_reason, ban_until
FROM user_management
WHERE status != 'active'
ORDER BY banned_at DESC;
```

### Statistiken

```sql
SELECT 
    status,
    COUNT(*) as count
FROM user_management
GROUP BY status;
```

---

## 🚀 Deployment

Die Dateien sind bereits in deinem Projekt:
- `user-management.js` - Verwaltungs-Logik
- `admin.html` - Admin-Panel

Beim nächsten `git push` werden sie automatisch deployed!

---

## 💡 Tipps

1. **Teste zuerst** mit einem Test-Account
2. **Dokumentiere** Sperr-Gründe klar
3. **Prüfe regelmäßig** abgelaufene Sperren
4. **Backup** der Datenbank regelmäßig machen

---

## 🆘 Troubleshooting

### Google Login funktioniert nicht
- Überprüfe Redirect URI in Google Console
- Überprüfe Client ID/Secret in Supabase

### Admin-Panel zeigt "Keine Berechtigung"
- Überprüfe, ob du in `admins` Tabelle bist
- SQL ausführen: `SELECT * FROM admins;`

### Nutzer wird nicht automatisch entsperrt
- Überprüfe `ban_until` Zeitstempel
- Funktion `checkUserStatus` wird bei jedem Login aufgerufen

---

Bei Fragen oder Problemen: Melde dich! 😊
