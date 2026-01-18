# Siagechat - WebRTC Video Chat

Eine Omegle-ähnliche Video-Chat-Anwendung mit WebRTC.

## Features

- ✅ 1-zu-1 Video Chat
- ✅ Zufälliges Partner-Matching
- ✅ Auto-Search nach Skip
- ✅ Mobile-optimiert (iOS/Android)
- ✅ Swipe-Gesten auf Mobile
- ✅ Farbige Buttons (Rot/Grün)
- ✅ TV-Testbild während Suche

## Technologie

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- WebRTC für Video/Audio
- Socket.io für Signaling

**Backend:**
- Node.js + Express
- Socket.io Server
- WebRTC Signaling

## Lokale Installation

### 1. Dependencies installieren
```bash
cd server
npm install
```

### 2. Server starten
```bash
cd server
node server.js
```

Server läuft auf: `http://localhost:3000`

### 3. Frontend öffnen
Öffne `index.html` in deinem Browser oder nutze einen lokalen Server.

## Mit Ngrok testen (Mobile)

```bash
# Terminal 1: Server starten
cd server
node server.js

# Terminal 2: Ngrok starten
ngrok http 3000
```

Nutze die Ngrok HTTPS URL auf allen Geräten.

## Deployment

### Backend: Railway.app
1. GitHub Repo erstellen
2. Code pushen
3. Railway Account → Deploy from GitHub

### Frontend: Vercel
1. `config.js` → Backend-URL anpassen
2. Vercel Account → Deploy

## Konfiguration

`config.js`:
```javascript
signalingServer: window.location.origin  // Für Produktion anpassen
```

## Lizenz

Privates Projekt

## Autor

Erstellt: Januar 2026
