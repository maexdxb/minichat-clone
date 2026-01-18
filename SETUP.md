# Minichat Clone - Supabase Setup Anleitung

## 🚀 Schnellstart

Die App funktioniert **sofort** mit Mock-Authentifizierung. Für echte Google-Anmeldung folge den Schritten unten.

## 📋 Voraussetzungen

1. Ein kostenloses [Supabase](https://supabase.com) Konto
2. Ein [Google Cloud](https://console.cloud.google.com) Projekt für OAuth

## 🔧 Supabase Einrichtung

### Schritt 1: Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com)
2. Klicke auf "Start your project"
3. Erstelle ein neues Projekt:
   - Wähle einen Namen (z.B. "minichat-clone")
   - Wähle ein sicheres Datenbank-Passwort
   - Wähle eine Region (z.B. "Europe West")

### Schritt 2: API Credentials holen

1. Gehe zu deinem Projekt Dashboard
2. Klicke auf **Settings** (Zahnrad-Symbol) → **API**
3. Kopiere folgende Werte:
   - **Project URL** (z.B. `https://abcdefghijklmnop.supabase.co`)
   - **anon/public key** (langer JWT Token)

### Schritt 3: Google OAuth konfigurieren

#### In Google Cloud Console:

1. Gehe zu [Google Cloud Console](https://console.cloud.google.com)
2. Erstelle ein neues Projekt oder wähle ein existierendes
3. Aktiviere die **Google+ API**
4. Gehe zu **APIs & Services** → **Credentials**
5. Klicke auf **Create Credentials** → **OAuth 2.0 Client ID**
6. Wähle **Web application**
7. Füge folgende **Authorized redirect URIs** hinzu:
   ```
   https://DEIN-PROJEKT-REF.supabase.co/auth/v1/callback
   ```
   (Ersetze `DEIN-PROJEKT-REF` mit deiner Supabase Project Reference)
8. Kopiere **Client ID** und **Client Secret**

#### In Supabase Dashboard:

1. Gehe zu **Authentication** → **Providers**
2. Finde **Google** in der Liste
3. Aktiviere den Toggle
4. Füge deine **Client ID** und **Client Secret** ein
5. Klicke auf **Save**

### Schritt 4: Config.js aktualisieren

Öffne `config.js` und ersetze die Platzhalter:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijklmnop.supabase.co', // Deine Project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Dein anon key
};
```

## ✅ Testen

1. Öffne `index.html` in deinem Browser
2. Klicke auf **Anmelden**
3. Du solltest zum Google Login weitergeleitet werden
4. Nach erfolgreicher Anmeldung wirst du zurück zur App geleitet
5. Dein Name und Avatar sollten in der Header-Leiste erscheinen

## 🎭 Mock-Modus

Wenn Supabase nicht konfiguriert ist, verwendet die App automatisch einen Mock-Login:
- Klicke auf "Anmelden"
- Du wirst als "Demo User" eingeloggt
- Der Status wird in localStorage gespeichert

## 🔒 Sicherheit

- Der **anon key** ist sicher für Client-seitige Nutzung
- Supabase's Row Level Security (RLS) schützt deine Daten
- Verwende **niemals** den `service_role` key im Frontend!

## 📚 Weitere Ressourcen

- [Supabase Dokumentation](https://supabase.com/docs)
- [Supabase Auth mit Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Setup](https://support.google.com/cloud/answer/6158849)

## 🆘 Probleme?

**Fehler: "Invalid login credentials"**
- Überprüfe deine Supabase URL und anon key
- Stelle sicher, dass Google OAuth in Supabase aktiviert ist

**Redirect funktioniert nicht**
- Überprüfe die Redirect URI in Google Cloud Console
- Stelle sicher, dass sie exakt mit der Supabase Callback URL übereinstimmt

**Kein Avatar sichtbar**
- Google muss Zugriff auf Profil-Informationen haben
- Überprüfe die OAuth Scopes in Supabase
