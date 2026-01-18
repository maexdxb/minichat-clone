# Siagechat - Deployment Guide

## 🚀 Website veröffentlichen (Schritt für Schritt)

### Schritt 1: Vercel Account erstellen

1. Gehe zu [vercel.com](https://vercel.com)
2. Klicke auf "Sign Up"
3. Wähle "Continue with GitHub" (oder Email)
4. Erstelle einen kostenlosen Account

### Schritt 2: GitHub Repository erstellen (Optional aber empfohlen)

1. Gehe zu [github.com](https://github.com)
2. Klicke auf "New repository"
3. Name: `siagechat`
4. Wähle "Public" oder "Private"
5. Klicke "Create repository"

**Oder nutze Vercel CLI (einfacher):**

### Schritt 3: Vercel CLI installieren und deployen

```powershell
# Vercel CLI installieren
npm install -g vercel

# In dein Projekt-Verzeichnis wechseln
cd C:\Users\Max\.gemini\antigravity\scratch\minichat-clone

# Deployen (folge den Anweisungen)
vercel
```

**Beim ersten Mal wirst du gefragt:**
- Login with Vercel? → **Yes**
- Set up and deploy? → **Yes**
- Which scope? → Wähle deinen Account
- Link to existing project? → **No**
- Project name? → **siagechat** (oder dein Wunschname)
- In which directory is your code? → **./** (Enter drücken)
- Want to override settings? → **No**

**Fertig!** 🎉 Deine Website ist jetzt live unter: `https://siagechat.vercel.app`

---

## 🔐 Echte Google-Anmeldung aktivieren

### Schritt 1: Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com)
2. Klicke "Start your project"
3. Erstelle ein neues Projekt:
   - **Name**: siagechat
   - **Database Password**: Wähle ein sicheres Passwort
   - **Region**: Europe West (Frankfurt)
4. Warte 2 Minuten bis das Projekt bereit ist

### Schritt 2: Supabase Credentials kopieren

1. Gehe zu **Settings** → **API**
2. Kopiere:
   - **Project URL**: `https://xyz.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Schritt 3: Google OAuth einrichten

#### In Google Cloud Console:

1. Gehe zu [console.cloud.google.com](https://console.cloud.google.com)
2. Erstelle ein neues Projekt oder wähle ein existierendes
3. Gehe zu **APIs & Services** → **Credentials**
4. Klicke **Create Credentials** → **OAuth 2.0 Client ID**
5. Wähle **Web application**
6. **Authorized redirect URIs** hinzufügen:
   ```
   https://DEIN-PROJEKT-REF.supabase.co/auth/v1/callback
   ```
   (Ersetze `DEIN-PROJEKT-REF` mit deiner Supabase Project Reference aus der URL)
7. Kopiere **Client ID** und **Client Secret**

#### In Supabase Dashboard:

1. Gehe zu **Authentication** → **Providers**
2. Finde **Google** und aktiviere den Toggle
3. Füge ein:
   - **Client ID** (von Google)
   - **Client Secret** (von Google)
4. Klicke **Save**

### Schritt 4: Config.js aktualisieren

Öffne `config.js` und ersetze die Platzhalter:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://xyz.supabase.co', // Deine Supabase URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Dein anon key
};
```

### Schritt 5: Erneut deployen

```powershell
vercel --prod
```

**Fertig!** 🎉 Google Login funktioniert jetzt!

---

## 🎥 Echte Video-Verbindungen (WebRTC)

Für echte Peer-to-Peer Video-Verbindungen brauchst du einen **Signaling Server**. Hier sind deine Optionen:

### Option 1: PeerJS (Am einfachsten)

**Kostenloser PeerJS Cloud Server:**
- Keine Server-Konfiguration nötig
- Einfach zu implementieren
- Gut für Prototypen

### Option 2: Socket.io + eigener Server

**Für Production empfohlen:**
- Mehr Kontrolle
- Bessere Performance
- Skalierbar

### Option 3: Agora/Twilio (Managed Service)

**Kommerzielle Lösung:**
- Sehr zuverlässig
- Keine Server-Verwaltung
- Kostet Geld (aber hat Free Tier)

---

## 📝 Nächste Schritte

1. **Jetzt deployen**: Nutze Vercel CLI (siehe oben)
2. **Google Login einrichten**: Folge der Supabase-Anleitung
3. **WebRTC implementieren**: Soll ich dir zeigen, wie?

---

## 🆘 Hilfe benötigt?

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **WebRTC Tutorial**: [webrtc.org](https://webrtc.org)

---

## 💡 Wichtige Hinweise

- **HTTPS ist Pflicht** für WebRTC (Vercel gibt dir automatisch HTTPS)
- **Supabase Free Tier** ist ausreichend für den Start
- **Google OAuth** braucht eine verifizierte Domain (dauert 1-2 Tage)
- **WebRTC** funktioniert am besten mit STUN/TURN Servern

Viel Erfolg! 🚀
