# 🎨 Render.com Server Deployment - Schritt für Schritt

## Warum Render?

✅ **Komplett kostenlos** (750 Stunden/Monat)  
✅ **Server läuft 24/7** (auch wenn dein PC aus ist)  
✅ **Automatische Updates** bei Git-Push  
✅ **HTTPS** automatisch  
✅ **WebSocket-Support** (wichtig für WebRTC!)  
✅ **Keine Kreditkarte nötig!**

---

## SCHRITT 1: Render Account erstellen

1. Der Browser sollte bereits offen sein bei: `https://render.com`
2. Klicke auf **"Get Started"** oder **"Sign Up"**
3. Wähle **"GitHub"**
4. Autorisiere Render (falls gefragt)

---

## SCHRITT 2: Web Service erstellen

1. Nach dem Login: Klicke auf **"New +"** (oben rechts)
2. Wähle **"Web Service"**
3. Klicke auf **"Connect a repository"** oder **"Build and deploy from a Git repository"**

---

## SCHRITT 3: Repository verbinden

1. Du siehst deine GitHub-Repositories
2. Suche nach **"minichat-clone"**
3. Klicke auf **"Connect"**

---

## SCHRITT 4: Service konfigurieren

Fülle das Formular aus:

**Name:**
```
minichat-server
```

**Region:**
```
Frankfurt (EU Central)
```
(Oder die nächstgelegene Region)

**Branch:**
```
main
```

**Root Directory:**
```
server
```
⚠️ **WICHTIG:** Trage hier `server` ein!

**Runtime:**
```
Node
```
(Sollte automatisch erkannt werden)

**Build Command:**
```
npm install
```

**Start Command:**
```
node server.js
```

**Instance Type:**
```
Free
```
✅ Wähle den **kostenlosen Plan**!

---

## SCHRITT 5: Environment Variables (Optional)

Falls du Supabase verwendest:

1. Scrolle zu **"Environment Variables"**
2. Klicke auf **"Add Environment Variable"**
3. Füge hinzu:

```
Key: SUPABASE_URL
Value: https://jpvvlmqcqxmreffjhfvm.supabase.co
```

```
Key: SUPABASE_ANON_KEY
Value: [Dein Supabase Key]
```

---

## SCHRITT 6: Deploy starten

1. Klicke auf **"Create Web Service"** (unten)
2. Render startet das Deployment
3. Warte ~2-3 Minuten
4. Du siehst Logs im Dashboard

---

## SCHRITT 7: URL kopieren

Nach erfolgreichem Deployment:

1. Oben siehst du die URL deines Services:
   ```
   https://minichat-server.onrender.com
   ```
2. **📋 KOPIERE DIESE URL!**

---

## SCHRITT 8: Frontend aktualisieren

Jetzt müssen wir dem Frontend sagen, wo der Server ist!

### 8.1 config.js anpassen

Öffne `config.js` und ändere:

**Vorher:**
```javascript
signalingServer: window.location.origin,
```

**Nachher:**
```javascript
signalingServer: 'https://minichat-server.onrender.com',
```

(Ersetze die URL mit deiner Render-URL!)

### 8.2 Supabase-Keys aktualisieren

Ändere auch:

**Vorher:**
```javascript
supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
},
```

**Nachher:**
```javascript
supabase: {
    url: 'https://jpvvlmqcqxmreffjhfvm.supabase.co',
    anonKey: 'ek_publishable_...' // Dein echter Key
},
```

---

## SCHRITT 9: Änderungen zu GitHub pushen

```bash
git add config.js
git commit -m "Update signaling server URL to Render"
git push
```

Vercel deployed automatisch das Frontend neu!

---

## SCHRITT 10: Testen!

1. Warte ~30 Sekunden (Vercel Deployment)
2. Öffne deine Vercel-URL auf **2 Geräten** (PC + Handy)
3. Klicke auf beiden auf **"Suchen"**
4. **Ihr solltet euch jetzt finden!** 🎉

---

## 🔍 Überprüfung

### Server läuft?
Öffne deine Render-URL im Browser:
```
https://minichat-server.onrender.com
```

Du solltest sehen:
```
Siagechat Signaling Server is running!
```

### Logs ansehen
1. Render Dashboard → Dein Service
2. Klicke auf **"Logs"** (oben)
3. Sieh dir die Live-Logs an

---

## ⚠️ Wichtig: Free Tier Einschränkungen

**Render Free Plan:**
- ✅ 750 Stunden/Monat (kostenlos)
- ⚠️ **Server schläft nach 15 Minuten Inaktivität**
- ⚠️ **Erster Request nach Schlaf dauert ~30 Sekunden** (Cold Start)

**Was bedeutet das?**
- Wenn niemand die App nutzt → Server schläft
- Erster Nutzer → Muss ~30 Sekunden warten
- Danach → Alles normal schnell

**Lösung (optional):**
- Upgrade zu Render Paid Plan (~7$/Monat) für 24/7 ohne Schlaf
- Oder: Nutze einen "Ping-Service" (z.B. UptimeRobot), der den Server alle 5 Minuten anpingt

---

## 🔄 Automatische Updates

Ab jetzt:
1. Du änderst Code im `server`-Ordner
2. Du pushst zu GitHub
3. **Render** deployed den Server automatisch
4. **Vercel** deployed das Frontend automatisch (bei Frontend-Änderungen)

**Alles automatisch!** 🚀

---

## ⚠️ Troubleshooting

### Problem: "Build failed"
**Lösung:** 
- Überprüfe, ob **Root Directory** auf `server` gesetzt ist
- Überprüfe Logs: Welcher Fehler wird angezeigt?

### Problem: "Application failed to respond"
**Lösung:**
- Überprüfe `server.js`: `const PORT = process.env.PORT || 3000;`
- Render setzt den Port automatisch über `process.env.PORT`

### Problem: "Module not found"
**Lösung:**
- Überprüfe `server/package.json` - sind alle Dependencies aufgelistet?
- Build Command sollte sein: `npm install`

### Problem: Nutzer finden sich nicht
**Lösung:**
- Überprüfe `config.js` - ist die Render-URL richtig?
- Öffne Browser-Konsole (F12) - siehst du Fehler?
- Überprüfe Render-Logs

### Problem: "Service is sleeping"
**Lösung:**
- Das ist normal im Free Plan
- Warte ~30 Sekunden beim ersten Request
- Danach läuft alles normal

---

## 💰 Kosten

**Render Free Plan:**
- ✅ 750 Stunden/Monat kostenlos
- ✅ Automatisches HTTPS
- ✅ Automatische Deployments
- ⚠️ Server schläft nach 15 Min Inaktivität

**Für deine App:** Komplett kostenlos! 🎉

---

## 📊 Zusammenfassung

**Was läuft wo:**

| Komponente | Hosting | URL |
|------------|---------|-----|
| Frontend (HTML/CSS/JS) | Vercel | `https://minichat-clone.vercel.app` |
| Signaling Server | Render | `https://minichat-server.onrender.com` |
| Datenbank (Supabase) | Supabase | `https://xxx.supabase.co` |

**Alle 3 laufen in der Cloud!** ☁️

---

## 🎯 Zusammenfassung - Die Schritte

1. ✅ Render Account erstellen (mit GitHub)
2. ✅ New Web Service → Repository verbinden
3. ✅ Root Directory: `server` eintragen
4. ✅ Free Plan wählen
5. ✅ Deploy starten
6. ✅ URL kopieren
7. ✅ `config.js` aktualisieren
8. ✅ Zu GitHub pushen
9. ✅ Testen!

**Das war's!** 🚀

Bei Fragen oder Problemen: Ich helfe dir sofort weiter! 😊
