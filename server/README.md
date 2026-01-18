# Siagechat Server

WebRTC Signaling Server für Siagechat Video-Chat

## Features

- ✅ Socket.io WebSocket Server
- ✅ Random Partner Matching
- ✅ WebRTC Signaling (Offer/Answer/ICE)
- ✅ Warteschlangen-System
- ✅ Online User Counter
- ✅ Chat-Nachrichten Relay

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Server läuft auf `http://localhost:3000`

## Production

```bash
npm start
```

## Environment Variables

Erstelle eine `.env` Datei:

```env
PORT=3000
CLIENT_URL=https://siagechat.vercel.app
```

## API Endpoints

### GET /
Server Status und Statistiken

### GET /health
Health Check

## Socket.io Events

### Client → Server

- `find-partner` - Partner suchen
- `webrtc-offer` - WebRTC Offer senden
- `webrtc-answer` - WebRTC Answer senden
- `webrtc-ice-candidate` - ICE Candidate senden
- `chat-message` - Chat-Nachricht senden
- `skip-partner` - Nächsten Partner
- `stop-search` - Suche stoppen

### Server → Client

- `partner-found` - Partner gefunden
- `searching` - Suche läuft
- `partner-disconnected` - Partner getrennt
- `webrtc-offer` - WebRTC Offer empfangen
- `webrtc-answer` - WebRTC Answer empfangen
- `webrtc-ice-candidate` - ICE Candidate empfangen
- `chat-message` - Chat-Nachricht empfangen
- `online-count` - Online-Nutzer Update

## Deployment

### Railway.app

```bash
# Railway CLI installieren
npm install -g @railway/cli

# Login
railway login

# Projekt erstellen
railway init

# Deployen
railway up
```

### Render.com

1. Repository verbinden
2. Root Directory: `server`
3. Build Command: `npm install`
4. Start Command: `npm start`

### Heroku

```bash
heroku create siagechat-server
git subtree push --prefix server heroku main
```

## Lizenz

MIT
