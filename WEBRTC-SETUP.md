# Siagechat - WebRTC Setup Guide

## 🎉 Du hast jetzt ein VOLLSTÄNDIGES Video-Chat System!

### ✅ Was funktioniert:

1. **Echte Video-Verbindungen** - Peer-to-Peer WebRTC
2. **Als Gast fortfahren** - Kein Login nötig
3. **Google Login** - Optional (Supabase)
4. **Random Matching** - Automatische Partner-Suche
5. **Chat-Nachrichten** - Text-Chat während Video
6. **Skip Partner** - Nächsten Partner suchen
7. **Online Counter** - Echte Nutzer-Anzahl

---

## 🚀 Lokales Testen (2 Schritte)

### Schritt 1: Server starten

```powershell
# In den Server-Ordner wechseln
cd server

# Dependencies installieren (nur beim ersten Mal)
npm install

# Server starten
npm start
```

**Server läuft auf:** `http://localhost:3000`

### Schritt 2: Frontend öffnen

```powershell
# In einem NEUEN Terminal-Fenster
cd ..

# Lokalen Webserver starten
npx serve .
```

**Frontend läuft auf:** `http://localhost:3000` (oder Port 3001 wenn 3000 belegt)

### Schritt 3: Testen!

1. Öffne `http://localhost:3001` in **2 verschiedenen Browser-Tabs** (oder 2 Browsern)
2. Klicke in beiden auf **"Als Gast fortfahren"**
3. Klicke auf **"Start"** in beiden Tabs
4. **Erlaubt Kamera-Zugriff** in beiden
5. **Warte 2-5 Sekunden** → Ihr solltet euch jetzt sehen! 🎉

---

## 🌐 Production Deployment

### Backend (Signaling Server)

**Option 1: Railway.app** (Empfohlen - Kostenlos)

1. Gehe zu [railway.app](https://railway.app)
2. Klicke "Start a New Project"
3. Wähle "Deploy from GitHub repo"
4. Verbinde dein GitHub Repository
5. Wähle den `server` Ordner als Root
6. Railway deployed automatisch!
7. Kopiere die URL (z.B. `https://siagechat-production.up.railway.app`)

**Option 2: Render.com** (Auch kostenlos)

1. Gehe zu [render.com](https://render.com)
2. Klicke "New +" → "Web Service"
3. Verbinde GitHub Repository
4. Root Directory: `server`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Deploy!

**Option 3: Heroku**

```powershell
cd server
heroku create siagechat-server
git push heroku main
```

### Frontend

**Vercel / Netlify** (wie vorher beschrieben)

1. Deploy auf Vercel oder Netlify
2. **WICHTIG**: Update `config.js`:

```javascript
const SIAGECHAT_CONFIG = {
    signalingServer: 'https://deine-server-url.railway.app',  // ← Deine Server URL!
    // ...
};
```

3. Re-deploy!

---

## 🔧 Troubleshooting

### "Verbindung zum Server fehlgeschlagen"

- ✅ Server läuft auf Port 3000?
- ✅ `config.js` hat richtige Server-URL?
- ✅ CORS aktiviert im Server?

### "Kein Partner gefunden"

- ✅ Mindestens 2 Nutzer online?
- ✅ Beide haben auf "Start" geklickt?
- ✅ Server-Logs checken

### "Kein Video sichtbar"

- ✅ Kamera-Zugriff erlaubt?
- ✅ HTTPS aktiviert? (WebRTC braucht HTTPS in Production!)
- ✅ Browser-Console für Fehler checken

### "ICE Connection Failed"

- ✅ STUN Server erreichbar?
- ✅ Firewall blockiert WebRTC?
- ✅ Eventuell TURN Server nötig (für strenge Firewalls)

---

## 🎯 Nächste Schritte

### Empfohlene Verbesserungen:

1. **TURN Server** - Für bessere Verbindungen hinter Firewalls
   - Nutze [Twilio TURN](https://www.twilio.com/stun-turn) (kostenlos bis 10GB)
   - Oder [Metered TURN](https://www.metered.ca/tools/openrelay/) (kostenlos)

2. **Report-Funktion** - Nutzer melden
3. **Admin-Dashboard** - Statistiken & Moderation
4. **Chat-History** - Nachrichten speichern
5. **Profil-Bilder** - Für registrierte Nutzer
6. **Filter** - Nach Land/Geschlecht filtern

---

## 📊 Server-Monitoring

Dein Server zeigt Live-Stats unter:
`http://localhost:3000/` (oder deine Production-URL)

```json
{
  "status": "online",
  "service": "Siagechat Signaling Server",
  "onlineUsers": 42,
  "waitingInQueue": 3
}
```

---

## 🆘 Support

Bei Problemen:
1. Check Browser Console (F12)
2. Check Server Logs
3. Teste mit 2 Tabs lokal
4. Erstelle ein GitHub Issue

---

## 🎉 Fertig!

Du hast jetzt ein **vollständig funktionierendes** Minichat-Clone!

**Features:**
- ✅ Echte Video-Verbindungen
- ✅ Gast-Modus
- ✅ Random Matching
- ✅ Text-Chat
- ✅ Skip Partner
- ✅ Production-Ready

**Viel Erfolg!** 🚀
