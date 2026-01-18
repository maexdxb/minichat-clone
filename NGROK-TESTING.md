# 🌐 Siagechat - Öffentlich Testen mit Ngrok

## 🚀 Schnellstart (3 Schritte)

### Schritt 1: Ngrok installieren

1. Gehe zu [ngrok.com/download](https://ngrok.com/download)
2. Lade die Windows-Version herunter
3. Entpacke `ngrok.exe` in einen Ordner (z.B. `C:\ngrok`)
4. **Optional**: Erstelle kostenlosen Account auf ngrok.com für längere Sessions

### Schritt 2: Server starten

**Terminal 1** (Server):
```powershell
cd C:\Users\Max\.gemini\antigravity\scratch\minichat-clone\server
npm install
npm start
```

✅ Server läuft auf `http://localhost:3000`

**Terminal 2** (Ngrok für Server):
```powershell
cd C:\ngrok
.\ngrok http 3000
```

✅ Du bekommst eine URL wie: `https://abc123.ngrok-free.app`
📋 **KOPIERE DIESE URL!** (z.B. `https://abc123.ngrok-free.app`)

### Schritt 3: Frontend konfigurieren & starten

**1. Config aktualisieren:**

Öffne `config.js` und ändere:
```javascript
const SIAGECHAT_CONFIG = {
    signalingServer: 'https://abc123.ngrok-free.app',  // ← Deine Ngrok URL!
    // ...
};
```

**2. Frontend starten:**

**Terminal 3** (Frontend):
```powershell
cd C:\Users\Max\.gemini\antigravity\scratch\minichat-clone
npx serve . -p 8080
```

**Terminal 4** (Ngrok für Frontend):
```powershell
cd C:\ngrok
.\ngrok http 8080
```

✅ Du bekommst eine URL wie: `https://xyz789.ngrok-free.app`

---

## 🎉 FERTIG! Jetzt testen:

### Auf deinem PC:
Öffne: `https://xyz789.ngrok-free.app`

### Auf deinem Handy:
Öffne: `https://xyz789.ngrok-free.app`

### Freunde einladen:
Schicke ihnen: `https://xyz789.ngrok-free.app`

**Alle können sich jetzt gegenseitig sehen!** 🎥

---

## 📱 Testen:

1. **PC**: Öffne die Frontend-URL
2. **Handy**: Öffne die Frontend-URL
3. **Beide**: "Als Gast fortfahren" klicken
4. **Beide**: "Start" klicken
5. **Beide**: Kamera erlauben
6. **Warte 3-5 Sekunden**
7. **🎉 IHR SEHT EUCH!**

---

## ⚠️ WICHTIG:

### Ngrok Free Limits:
- ✅ Kostenlos
- ✅ HTTPS (wichtig für WebRTC!)
- ⚠️ URL ändert sich bei jedem Neustart
- ⚠️ Session läuft nach 2 Stunden ab (ohne Account)
- ⚠️ Mit Account: 8 Stunden Sessions

### Mit Ngrok Account (empfohlen):
1. Registriere auf [ngrok.com](https://ngrok.com)
2. Kopiere deinen Authtoken
3. Führe aus: `.\ngrok authtoken DEIN_TOKEN`
4. Jetzt: Längere Sessions + feste Domains (kostenpflichtig)

---

## 🔄 Wenn Ngrok neu startet:

1. **Neue Server-URL** von Ngrok Terminal kopieren
2. **`config.js` aktualisieren** mit neuer URL
3. **Frontend neu laden** (Strg+Shift+R)

---

## 💡 Alternative: Localtunnel (noch einfacher!)

Wenn Ngrok nicht funktioniert:

```powershell
# Server-Tunnel
npx localtunnel --port 3000

# Frontend-Tunnel (neues Terminal)
npx localtunnel --port 8080
```

Kopiere die URLs und update `config.js`!

---

## 🎯 Zusammenfassung:

**4 Terminals gleichzeitig:**
1. ✅ Server (`npm start`)
2. ✅ Ngrok Server (`ngrok http 3000`)
3. ✅ Frontend (`npx serve . -p 8080`)
4. ✅ Ngrok Frontend (`ngrok http 8080`)

**Dann:**
- Freunde können über Ngrok-URL zugreifen
- Funktioniert auf PC, Handy, Tablet
- Echte Video-Verbindungen!

---

## 🚀 Nächster Schritt: Production

Wenn es funktioniert, deploye auf:
- **Server**: Railway.app (kostenlos, permanent)
- **Frontend**: Vercel (kostenlos, permanent)

Dann hast du eine **permanente URL** ohne Ngrok!
